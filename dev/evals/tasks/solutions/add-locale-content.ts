import { type Client, type FieldValueInRequest, SchemaRepository, duplicateBlockRecord } from '@datocms/cma-client-node';
import * as Schema from './schema';

const TRANSLATIONS: Record<string, string> = { 'Fast.': 'Veloce.', 'Reliable.': 'Affidabile.' };

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g', { nested: true });
  const repo = new SchemaRepository(client);
  const italian: NonNullable<NonNullable<FieldValueInRequest<typeof page, 'highlights'>>['it']> = [];
  for (const block of page.highlights.en ?? []) {
    const copy = await duplicateBlockRecord<Schema.QuoteCard>(structuredClone(block), repo);
    const quote = block.attributes.quote ?? '';
    copy.attributes.quote = TRANSLATIONS[quote] ?? quote;
    italian.push(copy);
  }
  await client.items.update<Schema.LandingPage>(page.id, {
    tagline: { ...page.tagline, it: 'Rilascia subito' },
    highlights: { ...page.highlights, it: italian },
  });
}
