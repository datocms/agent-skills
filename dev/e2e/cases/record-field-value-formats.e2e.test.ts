import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, crc32 } from "node:zlib";
import type { Client } from "@datocms/cma-client-node";
import { expect, test } from "vitest";
import { runE2ETest } from "../lib/runE2ETest.js";

type Context = {
	venueModelId: string;
	milanId: string;
	amenityIds: { parking: string; bar: string; cloakroom: string };
	hallUploadId: string;
	stageUploadId: string;
};

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

async function upload(client: Client, name: string, content: Buffer): Promise<string> {
	const dir = mkdtempSync(join(tmpdir(), "dato-venue-case-"));
	const localPath = join(dir, name);
	writeFileSync(localPath, content);
	try {
		return (await client.uploads.createFromLocalFile({ localPath })).id;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

const VIDEO = {
	provider: "youtube",
	provider_uid: "jNQXAC9IVRw",
	url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
	title: "Me at the zoo",
	width: 480,
	height: 360,
	thumbnail_url: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
};
const PARAGRAPHS = ["A modern theatre in the Bicocca district.", "It hosts opera, ballet and concerts."];

/** The reference record; the overrides produce the traps. */
async function createVenue(client: Client, context: Context, overrides: Record<string, unknown> = {}): Promise<void> {
	await client.items.create({
		item_type: { type: "item_type", id: context.venueModelId },
		name: "Teatro Arcimboldi Milano",
		slug: "teatro-arcimboldi-milano",
		description: PARAGRAPHS.join("\n\n"),
		capacity: 1200,
		rating: 4.5,
		wheelchair_accessible: true,
		opens_on: "2027-03-01",
		first_show_at: "2027-03-01T20:30:00+01:00",
		brand_color: { red: 26, green: 115, blue: 232, alpha: 255 },
		location: { latitude: 45.4642, longitude: 9.19 },
		opening_hours: JSON.stringify({ mon: "9-18", sun: null }),
		seo: { title: "Teatro Arcimboldi | Milan", description: "Opera, ballet and concerts in Milan.", no_index: true },
		promo_video: VIDEO,
		city: context.milanId,
		amenities: [context.amenityIds.parking, context.amenityIds.cloakroom],
		cover: { upload_id: context.hallUploadId, alt: "Main hall", title: null, custom_data: {}, focal_point: { x: 0, y: 0 } },
		gallery: [{ upload_id: context.stageUploadId }, { upload_id: context.hallUploadId }],
		...overrides,
	} as never);
}

test("creates one record that sets a value on every field type in the shape the API stores", async () => {
	const outcome = await runE2ETest<Context>({
		name: "record-field-value-formats",
		maxAttempts: 12,
		fixtures: async (client) => {
			const city = await client.itemTypes.create({ name: "City", api_key: "city" });
			await client.fields.create(city.id, { label: "Name", api_key: "name", field_type: "string" });
			const milan = await client.items.create({ item_type: { type: "item_type", id: city.id }, name: "Milan" } as never);
			const amenity = await client.itemTypes.create({ name: "Amenity", api_key: "amenity" });
			await client.fields.create(amenity.id, { label: "Name", api_key: "name", field_type: "string" });
			const amenityIds: Record<string, string> = {};
			for (const name of ["Parking", "Bar", "Cloakroom"]) {
				const record = await client.items.create({ item_type: { type: "item_type", id: amenity.id }, name } as never);
				amenityIds[name.toLowerCase()] = record.id;
			}

			const venue = await client.itemTypes.create({ name: "Venue", api_key: "venue" });
			const field = (label: string, api_key: string, field_type: string, rest: object = {}) =>
				client.fields.create(venue.id, { label, api_key, field_type, ...rest } as never);
			const name = await field("Name", "name", "string");
			await field("Slug", "slug", "slug", { validators: { slug_title_field: { title_field_id: name.id } } });
			await field("Description", "description", "text");
			await field("Capacity", "capacity", "integer");
			await field("Rating", "rating", "float");
			await field("Wheelchair accessible", "wheelchair_accessible", "boolean");
			await field("Opens on", "opens_on", "date");
			await field("First show", "first_show_at", "date_time");
			await field("Brand colour", "brand_color", "color");
			await field("Location", "location", "lat_lon");
			await field("Opening hours", "opening_hours", "json");
			await field("SEO", "seo", "seo");
			await field("Promo video", "promo_video", "video");
			await field("City", "city", "link", { validators: { item_item_type: { item_types: [city.id] } } });
			await field("Amenities", "amenities", "links", { validators: { items_item_type: { item_types: [amenity.id] } } });
			await field("Cover", "cover", "file");
			await field("Gallery", "gallery", "gallery");

			return {
				venueModelId: venue.id,
				milanId: milan.id,
				amenityIds: amenityIds as Context["amenityIds"],
				hallUploadId: await upload(client, "main-hall.png", png(64, 48)),
				stageUploadId: await upload(client, "stage.png", png(48, 64)),
			};
		},
		task: ({ context }) =>
			`Create one "venue" record with these details (field API keys in brackets):\n` +
			`- Name [name]: Teatro Arcimboldi Milano. Its slug [slug] is the one the dashboard would generate from the name.\n` +
			`- Description [description]: two paragraphs, "${PARAGRAPHS[0]}" and "${PARAGRAPHS[1]}", separated by a blank line.\n` +
			`- Capacity [capacity]: 1200. Average rating [rating]: 4.5. Wheelchair accessible [wheelchair_accessible]: yes.\n` +
			`- Opens on [opens_on]: 1 March 2027. First show [first_show_at]: 1 March 2027 at 20:30 Rome time.\n` +
			`- Brand colour [brand_color]: #1A73E8, fully opaque.\n` +
			`- Location [location]: 45.4642 N, 9.1900 E.\n` +
			`- Opening hours [opening_hours]: the structured data {"mon":"9-18","sun":null}.\n` +
			`- Search engines [seo]: title "Teatro Arcimboldi | Milan", description "Opera, ballet and concerts in Milan.", and the page must not be indexed.\n` +
			`- Promo video [promo_video]: the YouTube video ${VIDEO.url} (title "${VIDEO.title}", ${VIDEO.width}x${VIDEO.height}, thumbnail ${VIDEO.thumbnail_url}).\n` +
			`- City [city]: Milan (record "${context.milanId}").\n` +
			`- Amenities [amenities]: Parking (record "${context.amenityIds.parking}") then Cloakroom (record "${context.amenityIds.cloakroom}").\n` +
			`- Cover [cover]: the existing asset "${context.hallUploadId}", with alternative text "Main hall" and its focal point in the top left corner.\n` +
			`- Gallery [gallery]: the existing assets "${context.stageUploadId}" then "${context.hallUploadId}".\n` +
			`Do not upload new files and do not change the other records.`,
		solution: ({ cmaClient, context }) => createVenue(cmaClient, context),
		traps: {
			"slug left for the API to generate": ({ cmaClient, context }) => createVenue(cmaClient, context, { slug: undefined }),
			"show time sent without its offset": ({ cmaClient, context }) =>
				createVenue(cmaClient, context, { first_show_at: "2027-03-01T20:30:00" }),
			"full opacity written as alpha 1": ({ cmaClient, context }) =>
				createVenue(cmaClient, context, { brand_color: { red: 26, green: 115, blue: 232, alpha: 1 } }),
		},
		assert: async ({ cmaClient, context }) => {
			const venues = await cmaClient.items.list({ filter: { type: context.venueModelId } });
			expect(venues, "exactly one venue record").toHaveLength(1);
			const v = venues[0]! as Record<string, any>;

			expect(v.name, "name").toBe("Teatro Arcimboldi Milano");
			expect(v.slug, "slug as the dashboard generates it").toBe("teatro-arcimboldi-milano");
			const paragraphs = String(v.description ?? "")
				.replace(/\r\n/g, "\n")
				.trim()
				.split(/\n[ \t]*\n/)
				.map((p) => p.trim());
			expect(paragraphs, "description: two paragraphs").toEqual(PARAGRAPHS);
			expect(v.capacity, "capacity").toBe(1200);
			expect(v.rating, "rating").toBe(4.5);
			expect(v.wheelchair_accessible, "wheelchair accessible").toBe(true);
			expect(v.opens_on, "opening date").toBe("2027-03-01");
			expect(Date.parse(v.first_show_at), `first show at 20:30 Rome time (stored ${v.first_show_at})`).toBe(
				Date.parse("2027-03-01T20:30:00+01:00"),
			);
			expect(v.brand_color, "brand colour #1A73E8, fully opaque").toEqual({ red: 26, green: 115, blue: 232, alpha: 255 });
			expect(v.location?.latitude, "latitude").toBeCloseTo(45.4642, 6);
			expect(v.location?.longitude, "longitude").toBeCloseTo(9.19, 6);
			expect(typeof v.opening_hours, "opening hours stored as JSON text").toBe("string");
			expect(JSON.parse(v.opening_hours), "opening hours").toEqual({ mon: "9-18", sun: null });
			expect(v.seo?.title, "SEO title").toBe("Teatro Arcimboldi | Milan");
			expect(v.seo?.description, "SEO description").toBe("Opera, ballet and concerts in Milan.");
			expect(v.seo?.no_index, "SEO: do not index").toBe(true);
			expect(v.promo_video, "promo video").toMatchObject({
				provider: "youtube",
				provider_uid: VIDEO.provider_uid,
				title: VIDEO.title,
				width: VIDEO.width,
				height: VIDEO.height,
				thumbnail_url: VIDEO.thumbnail_url,
			});
			expect(String(v.promo_video?.url), "promo video URL").toContain(VIDEO.provider_uid);
			expect(v.city, "city").toBe(context.milanId);
			expect(v.amenities, "amenities in order").toEqual([context.amenityIds.parking, context.amenityIds.cloakroom]);
			expect(v.cover?.upload_id, "cover asset").toBe(context.hallUploadId);
			expect(v.cover?.alt, "cover alternative text").toBe("Main hall");
			expect(v.cover?.focal_point, "cover focal point in the top left corner").toEqual({ x: 0, y: 0 });
			expect(
				(v.gallery ?? []).map((f: { upload_id: string }) => f.upload_id),
				"gallery assets in order",
			).toEqual([context.stageUploadId, context.hallUploadId]);

			expect(await cmaClient.uploads.list(), "no new uploads").toHaveLength(2);
			const all = await cmaClient.items.list();
			expect(all, "only the venue was added (1 city, 3 amenities, 1 venue)").toHaveLength(5);
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
