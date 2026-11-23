import { NextResponse } from "next/server";

type Body = { item: { attributes: Record<string, unknown> }; itemType: { attributes: { api_key: string } }; locale: string };

function pathFor(body: Body): string | null {
  switch (body.itemType.attributes.api_key) {
    case "post":
      return `/blog/${body.item.attributes.slug}`;
    case "homepage":
      return "/";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const path = pathFor(body);
  return NextResponse.json({ previewLinks: path ? [{ label: "Published version", url: new URL(path, request.url).toString() }] : [] });
}
