import { type Client, SchemaRepository, buildBlockRecord, duplicateBlockRecord, isBlockOfType } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const source = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g', { nested: true });
  const quote = source.sections[2];
  if (!quote || !isBlockOfType(Schema.QuoteCard.ID, quote)) throw new Error('Third block is not a quote card');
  const repo = new SchemaRepository(client);

  await client.items.create<Schema.LandingPage>({
    item_type: Schema.LandingPage.REF,
    title: 'Autumn launch',
    tagline: { en: 'Fall forward' },
    sections: [
      buildBlockRecord<Schema.Hero>({
        item_type: Schema.Hero.REF,
        headline: 'Autumn is here',
        ctas: [
          buildBlockRecord<Schema.Button>({ item_type: Schema.Button.REF, label: 'Shop now', url: 'https://acme.example/shop', style: 'primary' }),
          buildBlockRecord<Schema.Button>({ item_type: Schema.Button.REF, label: 'See the guide', url: 'https://acme.example/guide', style: 'secondary' }),
        ],
      }),
      await duplicateBlockRecord<Schema.QuoteCard>(structuredClone(quote), repo),
    ],
    sidebar: [],
    highlights: { en: [] },
  });
}
