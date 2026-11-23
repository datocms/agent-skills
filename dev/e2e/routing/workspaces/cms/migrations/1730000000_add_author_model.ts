import type { Client } from "datocms/lib/cma-client-node";

export default async function (client: Client) {
  const author = await client.itemTypes.create({ name: "Author", api_key: "author" });
  await client.fields.create(author.id, { label: "Name", api_key: "name", field_type: "string", validators: { required: {} } });
  await client.fields.create(author.id, { label: "Bio", api_key: "bio", field_type: "text" });
}
