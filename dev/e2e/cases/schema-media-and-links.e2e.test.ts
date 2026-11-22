import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, crc32 } from "node:zlib";
import { ApiError, type Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = {
	articleModelId: string;
	authorModelId: string;
	tagModelId: string;
	publishedAuthorId: string;
	unpublishedAuthorId: string;
	tagIds: string[];
};

/** Resolves to the API error codes when the call is refused, or null when it succeeds. */
async function refusal(call: () => Promise<unknown>): Promise<string | null> {
	try {
		await call();
		return null;
	} catch (error) {
		if (!(error instanceof ApiError)) throw error;
		return error.errors.map((e) => e.attributes.code).join(",") || "refused";
	}
}

/** A blank greyscale PNG of the given size. */
function png(width: number, height: number): Buffer {
	const chunk = (type: string, data: Buffer) => {
		const body = Buffer.concat([Buffer.from(type), data]);
		const head = Buffer.alloc(4);
		head.writeUInt32BE(data.length);
		const tail = Buffer.alloc(4);
		tail.writeUInt32BE(crc32(body));
		return Buffer.concat([head, body, tail]);
	};
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(Buffer.alloc((width + 1) * height))),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

const pdf = (bytes: number) =>
	Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(Math.max(0, bytes - 9), 32)]);

async function upload(client: Client, name: string, content: Buffer): Promise<string> {
	const dir = mkdtempSync(join(tmpdir(), "dato-media-case-"));
	const localPath = join(dir, name);
	writeFileSync(localPath, content);
	try {
		return (await client.uploads.createFromLocalFile({ localPath })).id;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

/** The reference schema change; the options produce the traps. */
async function addFields(
	client: Client,
	context: Context,
	options: { attachmentTypes?: object; onUnpublishedAuthor?: string } = {},
): Promise<void> {
	const add = (api_key: string, label: string, field_type: string, rest: object) =>
		client.fields.create(context.articleModelId, { api_key, label, field_type, ...rest } as never);
	await add("cover", "Cover", "file", {
		validators: {
			required: {},
			extension: { predefined_list: "image" },
			required_alt_title: { alt: true, title: false },
			image_dimensions: { width_min_value: 1200, height_min_value: 1 },
		},
	});
	await add("attachments", "Attachments", "gallery", {
		validators: {
			size: { max: 5 },
			extension: options.attachmentTypes ?? { extensions: ["pdf"] },
			file_size: { max_value: 10, max_unit: "MB" },
		},
	});
	await add("author", "Author", "link", {
		validators: {
			required: {},
			item_item_type: {
				item_types: [context.authorModelId],
				on_publish_with_unpublished_references_strategy: options.onUnpublishedAuthor ?? "fail",
			},
		},
		appearance: { editor: "link_select", parameters: { filters: [] }, addons: [] },
	});
	await add("tags", "Tags", "links", {
		validators: {
			size: { min: 1, max: 5 },
			items_item_type: { item_types: [context.tagModelId], on_reference_delete_strategy: "delete_references" },
		},
	});
}

test("adds asset and link fields whose rules and reference strategies hold in behaviour", async () => {
	const outcome = await runE2ETest<Context>({
		name: "schema-media-and-links",
		maxAttempts: 12,
		fixtures: async (client) => {
			const author = await client.itemTypes.create({ name: "Author", api_key: "author", draft_mode_active: true });
			await client.fields.create(author.id, { label: "Name", api_key: "name", field_type: "string" });
			const tag = await client.itemTypes.create({ name: "Tag", api_key: "tag", draft_mode_active: false });
			await client.fields.create(tag.id, { label: "Label", api_key: "label", field_type: "string" });
			const article = await client.itemTypes.create({ name: "Article", api_key: "article", draft_mode_active: true });
			await client.fields.create(article.id, { label: "Title", api_key: "title", field_type: "string" });

			const authorIds: string[] = [];
			for (const name of ["Maya Liu", "Omar Hassan", "Noor Haddad"]) {
				const record = await client.items.create({ item_type: { type: "item_type", id: author.id }, name } as never);
				authorIds.push(record.id);
			}
			await client.items.publish(authorIds[0]!);
			await client.items.publish(authorIds[1]!);
			const tagIds: string[] = [];
			for (const label of ["News", "Design", "Engineering", "Culture", "Events", "Hiring"]) {
				const record = await client.items.create({ item_type: { type: "item_type", id: tag.id }, label } as never);
				tagIds.push(record.id);
			}
			return {
				articleModelId: article.id,
				authorModelId: author.id,
				tagModelId: tag.id,
				publishedAuthorId: authorIds[0]!,
				unpublishedAuthorId: authorIds[2]!,
				tagIds,
			};
		},
		task: () =>
			`Add these fields to the existing "article" model (use exactly these API keys):\n` +
			`- \`cover\`: exactly one image. Only images can go here, no other kind of file. It is mandatory, the image must have alternative text, and it must be at least 1200 pixels wide.\n` +
			`- \`attachments\`: up to 5 files, PDF only, none of them larger than 10 MB.\n` +
			`- \`author\`: a mandatory reference to one "author" record, which editors choose from a dropdown.\n` +
			`- \`tags\`: between 1 and 5 "tag" records.\n` +
			`When someone tries to publish an article whose author is still unpublished, the publication must be refused. ` +
			`When a tag is deleted, it must simply disappear from the articles that use it, and those articles keep their other tags.`,
		solution: ({ cmaClient, context }) => addFields(cmaClient, context),
		traps: {
			"PDF limit expressed as the documents preset": ({ cmaClient, context }) =>
				addFields(cmaClient, context, { attachmentTypes: { predefined_list: "document" } }),
			"publishing an article also publishes its author": ({ cmaClient, context }) =>
				addFields(cmaClient, context, { onUnpublishedAuthor: "publish_references" }),
		},
		assert: async ({ cmaClient, context }) => {
			const fields = await cmaClient.fields.list(context.articleModelId);
			const field = (apiKey: string) => fields.find((f) => f.api_key === apiKey);
			expect(field("cover")?.field_type, "cover is a single-asset field").toBe("file");
			expect(field("attachments")?.field_type, "attachments is a multiple-asset field").toBe("gallery");
			expect(field("author")?.field_type, "author is a single link").toBe("link");
			expect(field("tags")?.field_type, "tags is a multiple link").toBe("links");
			expect(field("author")?.appearance.editor, "author is chosen from a dropdown").toBe("link_select");
			const authorRule = (field("author")!.validators as Record<string, Record<string, unknown>>).item_item_type ?? {};
			expect(authorRule.item_types, "author links only to authors").toEqual([context.authorModelId]);
			expect(authorRule.on_publish_with_unpublished_references_strategy, "unpublished author refuses publication").toBe("fail");
			const tagsRule = (field("tags")!.validators as Record<string, Record<string, unknown>>).items_item_type ?? {};
			expect(tagsRule.item_types, "tags links only to tags").toEqual([context.tagModelId]);
			expect(tagsRule.on_reference_delete_strategy, "a deleted tag is unlinked").toBe("delete_references");

			const image = await upload(cmaClient, "cover.png", png(1200, 800));
			const narrow = await upload(cmaClient, "narrow.png", png(1199, 800));
			const smallPdf = await upload(cmaClient, "brief.pdf", pdf(2000));
			const docx = await upload(cmaClient, "brief.docx", Buffer.from("PK\u0003\u0004 not really a document"));
			const cover = (upload_id: string, alt: string | null = "Alt text") => ({
				upload_id,
				alt,
				title: "Title",
				custom_data: {},
				focal_point: null,
			});
			const item_type = { type: "item_type" as const, id: context.articleModelId };
			const [t0, t1, t2, t3, t4, t5] = context.tagIds as [string, string, string, string, string, string];
			const base = { item_type, title: "Probe", cover: cover(image), author: context.publishedAuthorId, tags: [t0, t1] };
			const probe = (values: Record<string, unknown>) => () => cmaClient.items.validateNew({ ...base, ...values } as never);
			const accepts = async (values: Record<string, unknown>, what: string) =>
				expect(await refusal(probe(values)), `${what} must be accepted`).toBeNull();
			const rejects = async (values: Record<string, unknown>, what: string) =>
				expect(await refusal(probe(values)), `${what} must be rejected`).not.toBeNull();

			await accepts({}, "an article with a 1200-pixel-wide cover, one author and two tags");
			await rejects({ cover: null }, "an article without a cover");
			await rejects({ cover: cover(image, null) }, "a cover without alternative text");
			await rejects({ cover: cover(narrow) }, "a 1199-pixel-wide cover");
			await rejects({ cover: cover(smallPdf) }, "a PDF as cover");
			const asAttachment = (id: string) => ({ upload_id: id });
			await accepts({ attachments: Array(5).fill(asAttachment(smallPdf)) }, "five PDF attachments");
			await rejects({ attachments: Array(6).fill(asAttachment(smallPdf)) }, "six attachments");
			await rejects({ attachments: [asAttachment(docx)] }, "a Word document as attachment");
			await rejects({ attachments: [asAttachment(image)] }, "an image as attachment");
			await rejects({ author: null }, "an article without author");
			await rejects({ author: t0 }, "a tag as author");
			await rejects({ tags: [] }, "an article without tags");
			await accepts({ tags: [t0, t1, t2, t3, t4] }, "five tags");
			await rejects({ tags: [t0, t1, t2, t3, t4, t5] }, "six tags");

			// Publishing with an unpublished author is refused and does not publish the author.
			let draftAuthorArticle: { id: string } | undefined;
			const saveRefusal = await refusal(async () => {
				draftAuthorArticle = await cmaClient.items.create({ ...base, author: context.unpublishedAuthorId } as never);
			});
			if (draftAuthorArticle) {
				expect(
					await refusal(() => cmaClient.items.publish(draftAuthorArticle!.id)),
					"publishing with an unpublished author",
				).toContain("UNPUBLISHED_LINK");
			} else {
				// A model without draft mode publishes on save: the save itself must then be refused for that reason.
				expect(saveRefusal, "saving with an unpublished author").toContain("UNPUBLISHED_LINK");
			}
			expect((await cmaClient.items.find(context.unpublishedAuthorId)).meta.status, "the author stays unpublished").toBe(
				"draft",
			);

			// Deleting a tag unlinks it and leaves the article's other tags.
			const tagged = await cmaClient.items.create({ ...base, title: "Tagged", tags: [t2, t3] } as never);
			if (tagged.meta.status === "draft") await cmaClient.items.publish(tagged.id);
			expect(await refusal(() => cmaClient.items.destroy(t2)), "deleting a tag in use").toBeNull();
			expect((await cmaClient.items.find(tagged.id)).tags, "the article keeps its other tag").toEqual([t3]);

			// Size limit: 10 MB read as decimal or binary megabytes.
			const nearLimit = await upload(cmaClient, "near.pdf", pdf(9_500_000));
			const overLimit = await upload(cmaClient, "over.pdf", pdf(11_000_000));
			await accepts({ attachments: [asAttachment(nearLimit)] }, "a 9.5 MB PDF");
			await rejects({ attachments: [asAttachment(overLimit)] }, "an 11 MB PDF");
		},
	});

	if (!outcome.passed) {
		throw new Error(
			`E2E failed: ${outcome.reason}\n` +
				`Attempts: ${outcome.attempts}\n` +
				`Tool calls: ${outcome.toolCallNames.join(", ") || "(none)"}\n` +
				`Transcript: ${outcome.transcriptPath}\n` +
				(outcome.finalText ? `Final text: ${outcome.finalText}\n` : ""),
		);
	}

	console.log(
		`✓ ${outcome.name} passed in ${outcome.attempts} script attempt(s). Transcript: ${outcome.transcriptPath}`,
	);
});
