import { notFound } from "next/navigation";
import { executeQuery } from "@/lib/datocms/executeQuery";

const query = /* GraphQL */ `
  query Post($slug: String) {
    post(filter: { slug: { eq: $slug } }) { title body { value } }
  }
`;

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { post } = await executeQuery<{ post: { title: string; body: { value: unknown } } | null }>(query, { slug });
  if (!post) notFound();
  return (
    <article>
      <h1>{post.title}</h1>
      <pre>{JSON.stringify(post.body.value, null, 2)}</pre>
    </article>
  );
}
