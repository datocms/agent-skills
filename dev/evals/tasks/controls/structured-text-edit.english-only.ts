// Wrong: sends only the English locale of a localized field.
import { type Client } from '@datocms/cma-client-node';
import { isHeading, mapNodes } from 'datocms-structured-text-utils';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const article = await client.items.find<Schema.Article>('W5gnRswJRyq3WQ6cKM68gg', { nested: true });
  const english = article.body.en;
  if (!english) throw new Error('Missing English body');
  const content = mapNodes(english, (node) => (isHeading(node) && node.level === 1 ? { ...node, level: 2 as const } : node));
  await client.items.update(article.id, { body: { en: content } });
}
