import { type Client, type FieldValueInRequest, buildBlockRecord } from '@datocms/cma-client-node';
import { isBlockWithItemOfType, isHeading, isSpan, mapNodes } from 'datocms-structured-text-utils';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const article = await client.items.find<Schema.Article>('W5gnRswJRyq3WQ6cKM68gg', { nested: true });
  const english = article.body.en;
  if (!english) throw new Error('Missing English body');

  const content: NonNullable<FieldValueInRequest<typeof article, 'body'>>['en'] = mapNodes(english, (node) => {
    if (isBlockWithItemOfType(Schema.Cta.ID, node)) {
      return { ...node, item: buildBlockRecord<Schema.Cta>({ id: node.item.id, url: `${node.item.attributes.url}?utm_source=article` }) };
    }
    if (isHeading(node) && node.level === 1) return { ...node, level: 2 as const };
    if (isSpan(node) && node.value.includes('Acme')) {
      return node.value.split(/(Acme)/).filter((part) => part !== '').map((part) => ({
        ...node,
        value: part,
        ...(part === 'Acme' ? { marks: [...new Set([...(node.marks ?? []), 'strong'])] } : {}),
      }));
    }
    return node;
  });
  if (!content) throw new Error('Unexpected empty document');
  content.document.children.push({ type: 'paragraph', children: [{ type: 'span', value: 'Updated for 2026.' }] });

  await client.items.update<Schema.Article>(article.id, { body: { ...article.body, en: content } });
}
