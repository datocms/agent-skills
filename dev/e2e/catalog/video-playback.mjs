import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "./plugin/node_modules/playwright/index.mjs";
import { executeQuery } from "./web/node_modules/@datocms/cda-client/dist/esm/index.js";
import * as cda from "./cda.mjs";
import { replayVisualApplication } from "./replay.mjs";
import { configureFramework, startArguments } from "./frameworks.mjs";

export const transport = "cda";
export const configure = configureFramework;
export const cleanup = cda.cleanup;
export const replay = (options) =>
  replayVisualApplication({ ...options, scenario: "video-playback" });

async function createClip(path) {
  const browser = await chromium.launch({
    channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      document.body.append(canvas);
      const context = canvas.getContext("2d");
      const draw = (frame) => {
        context.fillStyle = "#154b68";
        context.fillRect(0, 0, 320, 180);
        context.fillStyle = "#f6b53b";
        context.fillRect(frame % 250, 45, 60, 90);
      };
      draw(0);
      const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
      });
      const chunks = [];
      return await new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.onerror = reject;
        recorder.onstop = async () =>
          resolve(
            Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())),
          );
        recorder.start();
        let frame = 0;
        const timer = setInterval(() => draw((frame += 7)), 80);
        setTimeout(() => {
          clearInterval(timer);
          recorder.stop();
          stream.getTracks().forEach((track) => track.stop());
        }, 4200);
      });
    });
    assert.ok(bytes.length > 1000, "Generated clip is empty");
    writeFileSync(path, Buffer.from(bytes));
  } finally {
    await browser.close();
  }
}

export async function prepare(options) {
  const state = await cda.prepare(options);
  state.framework = "nextjs";
  delete state.environment.DATOCMS_DRAFT_CONTENT_CDA_TOKEN;
  state.environment.NEXT_TELEMETRY_DISABLED = "1";
  const reservation = createServer();
  await new Promise((r) => reservation.listen(0, "127.0.0.1", r));
  state.port = reservation.address().port;
  await new Promise((r) => reservation.close(r));
  state.origin = `http://localhost:${state.port}`;
  const clipPath = join(options.output, "playback-fixture.webm");
  await createClip(clipPath);
  const client = options.project.cmaClient;
  state.upload = await client.uploads.createFromLocalFile({
    localPath: clipPath,
    filename: "playback-fixture.webm",
  });
  const deadline = Date.now() + 180000;
  while (!state.upload.mux_playback_id && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    state.upload = await client.uploads.find(state.upload.id);
  }
  assert.ok(
    state.upload.mux_playback_id,
    "Video processing did not produce a playback ID",
  );
  await client.fields.create(state.records[0].item_type.id, {
    label: "Clip",
    api_key: "clip",
    field_type: "file",
  });
  await client.items.update(state.records[0].id, {
    title: {
      en: `English 0 ${state.marker}`,
      it: `Italiano 0 ${state.marker}`,
    },
    clip: {
      upload_id: state.upload.id,
      title: `Playback ${state.marker}`,
      alt: "Moving amber square",
      custom_data: {},
    },
  });
  await client.items.publish(state.records[0].id);
  state.before = await client.items.list({
    filter: { type: state.records[0].item_type.id },
  });
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const data = await executeQuery(
      '{ catalogArticle(filter: {slug: {eq: "article-0"}}) { clip { video { muxPlaybackId width height } } } }',
      {
        token: state.environment.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
        environment: options.project.environment,
      },
    );
    if (
      data.catalogArticle?.clip?.video?.muxPlaybackId ===
      state.upload.mux_playback_id
    ) {
      state.video = data.catalogArticle.clip.video;
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(ready, "Published video did not become available through CDA");
  appendFileSync(
    join(options.workspace, "SCHEMA.md"),
    "catalog_article also has an optional clip (file) containing a processed DatoCMS video on article-0; other articles have no clip.\n",
  );
  options.save("video-fixture.json", {
    uploadId: state.upload.id,
    video: state.video,
    duration: state.upload.duration,
  });
  return state;
}

export function prompt({ project }) {
  return `Add /watch/[slug] to this existing Next.js App Router project for published catalog_article records. Query their English title and optional clip video from DatoCMS, render the title as h1 and use the DatoCMS VideoPlayer for the clip. Keep normal play/pause/seek controls, no autoplay, the source aspect ratio, and the component's privacy defaults without analytics opt-in. Missing clips need a useful empty state, and unpublished or unknown records return 404. Use DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN and DATOCMS_ENVIRONMENT=${project.environment}; install the documented player peer dependency if needed. Do not hardcode video URLs or IDs, enable drafts, mutate CMS data, or deploy. Inspect SCHEMA.md and the real GraphQL schema, then verify the production build.`;
}

export async function check({
  project,
  state,
  workspace,
  output,
  environment,
  save,
}) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    ...environment,
    PORT: String(state.port),
    HOSTNAME: "127.0.0.1",
  };
  const built = spawnSync("npm", ["run", "build"], {
    cwd: workspace,
    env,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 5 * 1024 * 1024,
  });
  save("build.log", (built.stdout ?? "") + (built.stderr ?? ""));
  assert.equal(built.status, 0, "Video page production build failed");
  const server = spawn(process.execPath, startArguments(state), {
    cwd: workspace,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let logs = "",
    browser;
  server.stdout.on("data", (b) => {
    logs += b;
  });
  server.stderr.on("data", (b) => {
    logs += b;
  });
  const checks = [],
    errors = [],
    analytics = [],
    streams = [];
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        await fetch(state.origin);
        ready = true;
        break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(ready, "Video server did not start");
    browser = await chromium.launch({
      channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
      headless: true,
    });
    const context = await browser.newContext(),
      page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (new URL(request.url()).hostname.endsWith("litix.io"))
        analytics.push(new URL(request.url()).hostname);
    });
    page.on("response", (response) => {
      if (new URL(response.url()).hostname === "stream.mux.com")
        streams.push({
          status: response.status(),
          path: new URL(response.url()).pathname,
        });
    });
    assert.equal(
      (await page.goto(`${state.origin}/watch/article-0`)).status(),
      200,
    );
    assert.equal(
      await page.locator("h1").innerText(),
      `English 0 ${state.marker}`,
    );
    const player = page.locator("mux-player");
    await player.waitFor();
    await player.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => {
        const player = document.querySelector("mux-player");
        return player?.readyState >= 1 && player.duration > 1;
      },
      {},
      { timeout: 60000 },
    );
    const initial = await player.evaluate((element) => ({
      playbackId: element.playbackId,
      duration: element.duration,
      paused: element.paused,
      disableCookies: element.disableCookies,
      disableTracking: element.disableTracking,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }));
    save("video-initial.json", initial);
    assert.equal(initial.playbackId, state.video.muxPlaybackId);
    assert.equal(initial.paused, true);
    assert.ok(
      Math.abs(
        initial.width / initial.height - state.video.width / state.video.height,
      ) < 0.03,
    );
    assert.equal(initial.disableCookies, true);
    assert.equal(initial.disableTracking, true);
    checks.push(
      "real processed video loads with the expected playback ID, aspect ratio, controls and privacy defaults",
    );
    const playPause = player.locator("media-control-bar media-play-button");
    await player.hover();
    await player.locator('media-play-button[part~="pre-play"]').click();
    await page.waitForFunction(
      () => {
        const player = document.querySelector("mux-player");
        return player.currentTime > 0.25 && !player.paused;
      },
      {},
      { timeout: 30000 },
    );
    await player.hover();
    await playPause.click();
    assert.equal(await player.evaluate((element) => element.paused), true);
    await player.evaluate((element) => {
      element.currentTime = element.duration / 2;
    });
    await page.waitForFunction(() => {
      const player = document.querySelector("mux-player");
      return (
        Math.abs(player.currentTime - player.duration / 2) < 0.3 &&
        !player.seeking
      );
    });
    await player.hover();
    await playPause.click();
    await page.waitForFunction(
      () => document.querySelector("mux-player").ended,
      {},
      { timeout: 30000 },
    );
    assert.ok((await player.evaluate((element) => element.error)) == null);
    assert.ok(streams.some((response) => response.status === 200));
    assert.deepEqual(analytics, []);
    assert.equal(
      (await context.cookies()).filter((cookie) =>
        /(?:mux\.com|litix\.io)$/.test(cookie.domain),
      ).length,
      0,
    );
    checks.push(
      "browser play and pause, player seeking and end-of-stream work against real streaming media without analytics requests",
    );
    await page.screenshot({ path: join(output, "video-player.png") });
    assert.equal(
      (await page.goto(`${state.origin}/watch/article-1`)).status(),
      200,
    );
    assert.equal(
      await page.locator("h1").innerText(),
      `English 1 ${state.marker}`,
    );
    assert.equal(await page.locator("mux-player").count(), 0);
    for (const slug of ["article-3", "missing-record"])
      assert.equal((await fetch(`${state.origin}/watch/${slug}`)).status, 404);
    assert.deepEqual(errors, []);
    assert.deepEqual(
      await project.cmaClient.items.list({
        filter: { type: state.records[0].item_type.id },
      }),
      state.before,
    );
    checks.push(
      "empty clip, unpublished and missing record states are safe and CMS content is unchanged",
    );
    save("video-browser.json", { checks, initial, streams, analytics, errors });
    return checks;
  } finally {
    save("video-checkpoint.json", { checks, streams, analytics, errors });
    await browser?.close();
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
    save("server.log", logs);
  }
}
