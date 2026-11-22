// Wrong: re-creates the kept blocks instead of keeping them by ID.
import { type Client, type FieldValueInRequest, buildBlockRecord, isBlockOfType } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g', { nested: true });
  const sections: NonNullable<FieldValueInRequest<typeof page, 'sections'>> = [];
  for (const block of page.sections) {
    if (isBlockOfType(Schema.Hero.ID, block)) {
      sections.push(buildBlockRecord<Schema.Hero>({
        item_type: Schema.Hero.REF,
        headline: block.attributes.headline,
        subheadline: block.attributes.subheadline,
        ctas: block.attributes.ctas.map((cta) => buildBlockRecord<Schema.Button>({
          item_type: Schema.Button.REF,
          label: cta.attributes.label === 'Get started' ? 'Start free' : cta.attributes.label,
          url: cta.attributes.url,
          style: cta.attributes.style,
        })),
      }));
    } else if (isBlockOfType(Schema.QuoteCard.ID, block)) {
      sections.push(block.id);
    }
  }
  sections.push(buildBlockRecord<Schema.Cta>({ item_type: Schema.Cta.REF, label: 'Talk to us', url: 'https://acme.example/contact' }));
  await client.items.update<Schema.LandingPage>(page.id, { sections });
}
