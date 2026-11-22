// Wrong: references an existing block by ID while creating a record.
import { type Client, buildBlockRecord } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const source = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g');
  const quote = source.sections[2];
  if (!quote) throw new Error('No third block');
  await client.items.create<Schema.LandingPage>({
    item_type: Schema.LandingPage.REF,
    title: 'Autumn launch',
    tagline: { en: 'Fall forward' },
    sections: [buildBlockRecord<Schema.Hero>({ item_type: Schema.Hero.REF, headline: 'Autumn is here', ctas: [] }), quote],
  });
}
