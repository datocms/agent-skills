import { type Client, type FieldValueInRequest, SchemaRepository, duplicateBlockRecord, isBlockOfType } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g', { nested: true });
  const repo = new SchemaRepository(client);
  const sections: NonNullable<FieldValueInRequest<typeof page, 'sections'>> = [];
  const sidebar: NonNullable<FieldValueInRequest<typeof page, 'sidebar'>> = [];

  for (const block of page.sections) {
    if (isBlockOfType(Schema.QuoteCard.ID, block)) {
      sidebar.push(await duplicateBlockRecord<Schema.QuoteCard>(structuredClone(block), repo));
    } else {
      sections.push(block.id);
    }
  }
  for (const block of page.sidebar) sidebar.push(block.id);

  await client.items.update<Schema.LandingPage>(page.id, { sections, sidebar });
}
