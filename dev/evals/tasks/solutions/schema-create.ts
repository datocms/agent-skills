import type { Client } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const tier = await client.itemTypes.create({ name: 'Pricing tier', api_key: 'pricing_tier', modular_block: true });
  await client.fields.create(tier.id, { label: 'Name', api_key: 'name', field_type: 'string', validators: { required: {} } });
  await client.fields.create(tier.id, {
    label: 'Monthly price', api_key: 'monthly_price', field_type: 'float',
    validators: { required: {}, number_range: { min: 0 } },
  });
  await client.fields.create(tier.id, {
    label: 'Badge', api_key: 'badge', field_type: 'string',
    validators: { enum: { values: ['popular', 'best_value'] } },
    appearance: {
      editor: 'string_select',
      parameters: { options: [{ label: 'Popular', value: 'popular' }, { label: 'Best value', value: 'best_value' }] },
      addons: [],
    },
  });

  const page = await client.itemTypes.create({ name: 'Pricing page', api_key: 'pricing_page', draft_mode_active: true });
  const title = await client.fields.create(page.id, { label: 'Title', api_key: 'title', field_type: 'string', validators: { required: {} } });
  await client.fields.create(page.id, {
    label: 'Slug', api_key: 'slug', field_type: 'slug',
    validators: { required: {}, unique: {}, slug_title_field: { title_field_id: title.id }, slug_format: { predefined_pattern: 'webpage_slug' } },
  });
  await client.fields.create(page.id, {
    label: 'Intro', api_key: 'intro', field_type: 'structured_text',
    validators: {
      structured_text_blocks: { item_types: [Schema.QuoteCard.ID] },
      structured_text_links: { item_types: [Schema.Article.ID] },
      structured_text_inline_blocks: { item_types: [] },
    },
    appearance: {
      editor: 'structured_text',
      parameters: { heading_levels: [2, 3], marks: ['strong', 'emphasis'] },
      addons: [],
    },
  });
  await client.fields.create(page.id, {
    label: 'Tiers', api_key: 'tiers', field_type: 'rich_text',
    validators: { rich_text_blocks: { item_types: [tier.id] }, size: { min: 1, max: 4 } },
  });
  await client.fields.create(page.id, {
    label: 'Logos', api_key: 'logos', field_type: 'gallery',
    validators: { size: { min: 2 }, extension: { predefined_list: 'image' }, required_alt_title: { alt: true } },
  });
  await client.fields.create(page.id, {
    label: 'Features', api_key: 'features', field_type: 'json',
    appearance: {
      editor: 'string_multi_select',
      parameters: { options: [{ label: 'SSO', value: 'sso' }, { label: 'Audit log', value: 'audit_log' }, { label: 'SLA', value: 'sla' }] },
      addons: [],
    },
  });
  await client.fields.create(page.id, {
    label: 'Accent color', api_key: 'accent_color', field_type: 'color',
    appearance: { editor: 'color_picker', parameters: { enable_alpha: false, preset_colors: ['#FF7751', '#1D1D1D'] }, addons: [] },
  });
  await client.fields.create(page.id, {
    label: 'Owner', api_key: 'owner', field_type: 'link',
    validators: { required: {}, item_item_type: { item_types: [Schema.Author.ID], on_reference_delete_strategy: 'fail' } },
  });
}
