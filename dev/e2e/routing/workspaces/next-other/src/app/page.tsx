import { client } from "@/lib/contentful";

export default async function Home() {
  const entries = await client.getEntries({ content_type: "homepage", limit: 1 });
  const home = entries.items[0].fields as { title: string; subtitle: string; heroImage: { fields: { file: { url: string } } } };
  return (
    <main>
      <h1>{home.title}</h1>
      <p>{home.subtitle}</p>
      <img src={home.heroImage.fields.file.url} alt="" />
    </main>
  );
}
