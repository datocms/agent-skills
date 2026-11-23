import { executeQuery } from "@/lib/datocms/executeQuery";

const query = /* GraphQL */ `
  query Home {
    homepage { title subtitle heroImage { url alt } }
  }
`;

export default async function Home() {
  const { homepage } = await executeQuery<{ homepage: { title: string; subtitle: string; heroImage: { url: string; alt: string | null } } }>(query);
  return (
    <main>
      <h1>{homepage.title}</h1>
      <p>{homepage.subtitle}</p>
      <img src={homepage.heroImage.url} alt={homepage.heroImage.alt ?? ""} />
    </main>
  );
}
