import { type Client, type FieldValueInRequest, buildBlockRecord, isBlockOfType } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g', { nested: true });
  const sections: NonNullable<FieldValueInRequest<typeof page, 'sections'>> = [];

  for (const block of page.sections) {
    if (isBlockOfType(Schema.OldBanner.ID, block)) continue;
    if (isBlockOfType(Schema.Hero.ID, block)) {
      const ctas: NonNullable<FieldValueInRequest<typeof block, 'ctas'>> = [];
      let changed = false;
      for (const cta of block.attributes.ctas) {
        if (cta.attributes.label === 'Get started') {
          ctas.push(buildBlockRecord<Schema.Button>({ id: cta.id, label: 'Start free' }));
          changed = true;
        } else {
          ctas.push(cta.id);
        }
      }
      sections.push(changed ? buildBlockRecord<Schema.Hero>({ id: block.id, ctas }) : block.id);
      continue;
    }
    sections.push(block.id);
  }

  sections.push(buildBlockRecord<Schema.Cta>({ item_type: Schema.Cta.REF, label: 'Talk to us', url: 'https://acme.example/contact' }));
  await client.items.update<Schema.LandingPage>(page.id, { sections });
}
