// Wrong: guessed validator and editor names, incomplete appearance.
import type { Client } from '@datocms/cma-client-node';

export default async function (client: Client): Promise<void> {
  const tier = await client.itemTypes.create({ name: 'Pricing tier', api_key: 'pricing_tier', modular_block: true });
  await client.fields.create(tier.id, { label: 'Name', api_key: 'name', field_type: 'string', validators: { required: {} } });
  const page = await client.itemTypes.create({ name: 'Pricing page', api_key: 'pricing_page', draft_mode_active: true });
  await client.fields.create(page.id, {
    label: 'Intro', api_key: 'intro', field_type: 'structured_text',
    validators: { structured_text_blocks: { item_types: [] } },
  } as Parameters<Client['fields']['create']>[1]);
}
