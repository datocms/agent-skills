// Task evals: an agent writes `solution.ts` (default export `(client) => Promise<void>`),
// the runner executes it against the emulated project, and `check` inspects the
// resulting project state. Prompts state the outcome, never the technique.
import assert from 'node:assert/strict';
import { ID } from './fixture.mjs';

const record = (state, id) => state.records.find((entry) => entry.id === id);
const ids = (blocks) => blocks.map((block) => block.id);
const untouched = (run, recordId, fields) => {
  for (const field of fields) {
    assert.deepEqual(record(run.state, recordId).attributes[field], record(run.original, recordId).attributes[field], `\`${field}\` of ${recordId} must stay as it was`);
  }
};
const notPublished = (run) => assert.deepEqual(run.state.published, [], 'Nothing may be published or unpublished');
const onlyTouched = (run, recordIds) => {
  for (const before of run.original.records) {
    if (recordIds.includes(before.id)) continue;
    assert.deepEqual(record(run.state, before.id), before, `Record ${before.id} must not change`);
  }
};

/** Flattens a DAST tree into runs of text: [{ text, marks, path }]. */
function textRuns(node, trail = []) {
  if (node.type === 'span') return [{ text: node.value, marks: [...(node.marks ?? [])].sort(), trail }];
  return (node.children ?? []).flatMap((child) => textRuns(child, [...trail, node.type]));
}
const plainText = (node) => textRuns(node).map((run) => run.text).join('');

export const cases = [
  {
    id: 'nested-block-edit',
    prompt: `On the landing page record \`${ID.page}\` (model \`landing_page\`):

1. In every Hero block of \`sections\`, the button labelled "Get started" must read "Start free". Nothing else about those buttons changes.
2. Remove every \`old_banner\` block from \`sections\`.
3. Add a CTA block at the end of \`sections\`: label "Talk to us", url "https://acme.example/contact".

Leave everything else exactly as it is: the other blocks, their order, the other fields. Do not publish.`,
    check(run) {
      const before = record(run.original, ID.page).attributes;
      const after = record(run.state, ID.page).attributes;
      assert.deepEqual(ids(after.sections).slice(0, 3), [ID.hero1, ID.quote1, ID.hero2], 'sections must keep hero, quote card, hero (same blocks, same order) without the old banners');
      assert.equal(after.sections.length, 4, 'sections must hold 4 blocks');
      const [hero1, quote, hero2, added] = after.sections;
      assert.deepEqual(ids(hero1.attributes.ctas), [ID.hero1Start, ID.hero1Learn], 'the buttons of the first hero must be the same blocks');
      assert.deepEqual(hero1.attributes.ctas[0].attributes, { ...before.sections[0].attributes.ctas[0].attributes, label: 'Start free' });
      assert.deepEqual(hero1.attributes.ctas[1], before.sections[0].attributes.ctas[1], '"Learn more" must not change');
      assert.deepEqual(ids(hero2.attributes.ctas), [ID.hero2Start]);
      assert.deepEqual(hero2.attributes.ctas[0].attributes, { ...before.sections[3].attributes.ctas[0].attributes, label: 'Start free' });
      for (const [now, then] of [[hero1, before.sections[0]], [hero2, before.sections[3]]]) {
        assert.equal(now.attributes.headline, then.attributes.headline);
        assert.equal(now.attributes.subheadline, then.attributes.subheadline);
      }
      assert.deepEqual(quote, before.sections[2], 'the quote card must not change');
      assert.equal(added.item_type, ID.cta, 'the added block must be a CTA');
      assert.deepEqual(added.attributes, { label: 'Talk to us', url: 'https://acme.example/contact' });
      untouched(run, ID.page, ['title', 'tagline', 'sidebar', 'highlights']);
      onlyTouched(run, [ID.page]);
      notPublished(run);
    },
  },
  {
    id: 'structured-text-edit',
    prompt: `In the article record \`${ID.articleRecord}\` (model \`article\`), change the English \`body\` only:

1. Every occurrence of the word "Acme" in the text becomes bold, wherever it is: headings, paragraphs, list items, link text.
2. The level-1 heading becomes a level-2 heading.
3. The CTA block keeps its label; its url gets \`?utm_source=article\` appended.
4. Add a final paragraph: "Updated for 2026."

Everything else in the English body stays as it is (text, emphasis, links, embedded blocks and the mention). The Italian body and all other fields must not change. Do not publish.`,
    check(run) {
      const before = record(run.original, ID.articleRecord).attributes;
      const after = record(run.state, ID.articleRecord).attributes;
      assert.deepEqual(after.body.it, before.body.it, 'the Italian body must not change');
      untouched(run, ID.articleRecord, ['title', 'summary', 'featured']);
      const was = before.body.en.document.children;
      const now = after.body.en?.document.children;
      assert.ok(now, 'the English body must still be a document');
      assert.equal(now.length, was.length + 1, 'exactly one top-level node (the final paragraph) must be added');
      assert.deepEqual(now.map((node) => node.type), [...was.map((node) => node.type), 'paragraph'], 'the order and type of top-level nodes must not change');
      assert.equal(plainText(now.at(-1)), 'Updated for 2026.');
      was.forEach((node, index) => assert.equal(plainText(now[index]), plainText(node), `the text of top-level node ${index} must not change`));
      for (const run_ of now.slice(0, -1).flatMap((node) => textRuns(node))) {
        const bold = run_.marks.includes('strong');
        if (bold) assert.equal(run_.text.replaceAll('Acme', '').trim(), '', `only "Acme" may be bold, found bold text ${JSON.stringify(run_.text)}`);
        else assert.ok(!run_.text.includes('Acme'), `"Acme" must be bold in ${JSON.stringify(run_.text)}`);
      }
      const emphasised = now.flatMap((node) => textRuns(node)).filter((run_) => run_.marks.includes('emphasis'));
      assert.deepEqual(emphasised.map((run_) => run_.text), ['every day'], 'the emphasis on "every day" must survive');
      assert.deepEqual(now.filter((node) => node.type === 'heading').map((node) => node.level), [2, 2]);
      const cta = now[2].item;
      assert.equal(cta.id, ID.bodyCta, 'the CTA must be the same block');
      assert.deepEqual(cta.attributes, { label: 'Try Acme', url: 'https://acme.example/signup?utm_source=article' });
      assert.deepEqual(now[6].item, was[6].item, 'the quote card must not change');
      const inline = now[1].children.find((node) => node.type === 'inlineBlock');
      assert.deepEqual(inline?.item, was[1].children.find((node) => node.type === 'inlineBlock').item, 'the mention must be the same inline block');
      const link = now[4].children.find((node) => node.type === 'link');
      assert.equal(link?.url, 'https://acme.example/docs');
      assert.equal(now[4].children.find((node) => node.type === 'itemLink')?.item, ID.authorAda);
      onlyTouched(run, [ID.articleRecord]);
      notPublished(run);
    },
  },
  {
    id: 'add-locale-content',
    prompt: `The landing page record \`${ID.page}\` (model \`landing_page\`) has only English content in its localized fields. Add the Italian content:

- \`tagline\`: "Rilascia subito"
- \`highlights\`: the same quote cards as in English, in the same order, with the quotes translated ("Fast." becomes "Veloce.", "Reliable." becomes "Affidabile."); the author names stay the same.

The English content must remain exactly as it is. Do not publish.`,
    check(run) {
      const before = record(run.original, ID.page).attributes;
      const after = record(run.state, ID.page).attributes;
      assert.deepEqual(after.tagline, { en: 'Ship it', it: 'Rilascia subito' });
      assert.deepEqual(after.highlights.en, before.highlights.en, 'the English highlights must be the same blocks, unchanged');
      const italian = after.highlights.it;
      assert.equal(italian?.length, 2, 'Italian highlights must hold two quote cards');
      assert.deepEqual(italian.map((block) => block.attributes), [
        { quote: 'Veloce.', author_name: 'Lin' },
        { quote: 'Affidabile.', author_name: 'Ada' },
      ]);
      assert.ok(italian.every((block) => block.item_type === ID.quoteCard && !ids(before.highlights.en).includes(block.id)));
      untouched(run, ID.page, ['title', 'sections', 'sidebar']);
      onlyTouched(run, [ID.page]);
      notPublished(run);
    },
  },
  {
    id: 'create-record-with-blocks',
    prompt: `Create a new landing page (model \`landing_page\`):

- title "Autumn launch", English tagline "Fall forward"
- \`sections\`, in this order: a Hero with headline "Autumn is here" and two buttons ("Shop now" to https://acme.example/shop, primary; "See the guide" to https://acme.example/guide, secondary); then a copy of the quote card that is the third block in \`sections\` of the existing landing page \`${ID.page}\`.
- \`sidebar\` and \`highlights\` stay empty.

Do not change the existing landing page. Do not publish.`,
    check(run) {
      const created = run.state.records.filter((entry) => !run.original.records.some((before) => before.id === entry.id));
      assert.equal(created.length, 1, 'exactly one record must be created');
      const page = created[0];
      assert.equal(page.item_type, ID.landingPage);
      assert.equal(page.attributes.title, 'Autumn launch');
      assert.equal(page.attributes.tagline.en, 'Fall forward');
      const [hero, quote, ...rest] = page.attributes.sections;
      assert.deepEqual(rest, [], 'sections must hold exactly two blocks');
      assert.equal(hero?.item_type, ID.hero);
      assert.equal(hero.attributes.headline, 'Autumn is here');
      assert.deepEqual(hero.attributes.ctas.map((button) => button.attributes), [
        { label: 'Shop now', url: 'https://acme.example/shop', style: 'primary' },
        { label: 'See the guide', url: 'https://acme.example/guide', style: 'secondary' },
      ]);
      const source = record(run.original, ID.page).attributes.sections[2];
      assert.equal(quote?.item_type, ID.quoteCard);
      assert.notEqual(quote.id, source.id, 'the quote card must be a copy, not the same block');
      assert.deepEqual(quote.attributes, source.attributes);
      assert.deepEqual(page.attributes.sidebar, []);
      assert.ok(Object.values(page.attributes.highlights ?? {}).every((value) => value.length === 0), 'highlights must be empty');
      onlyTouched(run, []);
      notPublished(run);
    },
  },
  {
    id: 'move-block-between-fields',
    prompt: `On the landing page record \`${ID.page}\` (model \`landing_page\`), move the quote card out of \`sections\` and put it first in \`sidebar\`, with the same content. Everything else stays as it is. Do not publish.`,
    check(run) {
      const before = record(run.original, ID.page).attributes;
      const after = record(run.state, ID.page).attributes;
      assert.deepEqual(after.sections, before.sections.filter((block) => block.id !== ID.quote1), 'sections must keep its other blocks unchanged, in order');
      assert.equal(after.sidebar.length, 2);
      assert.equal(after.sidebar[0].item_type, ID.quoteCard);
      assert.deepEqual(after.sidebar[0].attributes, before.sections[2].attributes);
      assert.deepEqual(after.sidebar[1], before.sidebar[0], 'the existing sidebar CTA must not change');
      untouched(run, ID.page, ['title', 'tagline', 'highlights']);
      onlyTouched(run, [ID.page]);
      notPublished(run);
    },
  },
  {
    id: 'schema-create',
    prompt: `Extend the project's schema. Do not create any record.

A block model "Pricing tier" with these fields:
- Name: single-line text, required.
- Monthly price: decimal number, required, never below 0.
- Badge: optional; editors pick it from a dropdown with exactly two choices, "Popular" and "Best value", stored as \`popular\` and \`best_value\`. No other value may be saved.

A model "Pricing page" (with draft/published mode) with these fields:
- Title: single-line text, required.
- Slug: required, unique, URL-safe, pre-filled from the title in the editor.
- Intro: Structured Text. Editors may only use H2 and H3 headings and bold and italic. It may embed Quote card blocks and link to Article records. No inline blocks.
- Tiers: Modular Content that accepts only Pricing tier blocks, at least 1 and at most 4.
- Logos: an asset gallery, images only, at least 2 of them, and every image must have alt text.
- Features: editors tick any of three fixed options (SSO, Audit log, SLA; stored as \`sso\`, \`audit_log\`, \`sla\`) and the field stores the chosen values as an array.
- Accent color: a color with the presets #FF7751 and #1D1D1D offered in the picker, no transparency control.
- Owner: a required link to one Author record. Deleting an author that a pricing page links to must be refused.

Use the API keys \`pricing_tier\` and \`pricing_page\`, and snake_case API keys derived from the field names above (\`monthly_price\`, \`accent_color\`...).`,
    check(run) {
      const model = (apiKey) => run.state.itemTypes.find((type) => type.api_key === apiKey);
      const field = (type, apiKey) => {
        const found = run.state.fields.find((entry) => entry.item_type === type.id && entry.api_key === apiKey);
        assert.ok(found, `field \`${apiKey}\` of \`${type.api_key}\` is missing`);
        return found;
      };
      const editor = (entry, fallback) => entry.appearance?.editor ?? fallback;
      const tier = model('pricing_tier');
      const page = model('pricing_page');
      assert.ok(tier?.modular_block, '`pricing_tier` must be a block model');
      assert.ok(page && !page.modular_block && page.draft_mode_active, '`pricing_page` must be a regular model with draft mode');
      assert.deepEqual(run.state.records, run.original.records, 'no record may be created or changed');

      assert.ok(field(tier, 'name').field_type === 'string' && field(tier, 'name').validators.required);
      const price = field(tier, 'monthly_price');
      assert.equal(price.field_type, 'float');
      assert.ok(price.validators.required && price.validators.number_range?.min === 0, 'monthly_price must be required with number_range min 0');
      const badge = field(tier, 'badge');
      assert.equal(badge.field_type, 'string');
      assert.ok(!badge.validators.required, 'badge is optional');
      assert.deepEqual([...(badge.validators.enum?.values ?? [])].sort(), ['best_value', 'popular'], 'badge must be limited by an enum validator');
      assert.equal(editor(badge), 'string_select', 'badge must use the dropdown editor');
      assert.deepEqual(badge.appearance.parameters.options.map(({ label, value }) => [label, value]).sort(), [['Best value', 'best_value'], ['Popular', 'popular']]);

      const title = field(page, 'title');
      assert.ok(title.field_type === 'string' && title.validators.required);
      const slug = field(page, 'slug');
      assert.equal(slug.field_type, 'slug');
      assert.ok(slug.validators.required && slug.validators.unique, 'slug must be required and unique');
      assert.equal(slug.validators.slug_title_field?.title_field_id, title.id, 'slug must derive from the title field');
      assert.equal(slug.validators.slug_format?.predefined_pattern, 'webpage_slug', 'slug must be URL-safe');

      const intro = field(page, 'intro');
      assert.equal(intro.field_type, 'structured_text');
      assert.deepEqual(intro.validators.structured_text_blocks.item_types, [ID.quoteCard]);
      assert.deepEqual(intro.validators.structured_text_links.item_types, [ID.article]);
      assert.deepEqual(intro.validators.structured_text_inline_blocks?.item_types ?? [], [], 'no inline blocks');
      assert.equal(editor(intro), 'structured_text');
      assert.deepEqual([...intro.appearance.parameters.heading_levels].sort(), [2, 3]);
      assert.deepEqual([...intro.appearance.parameters.marks].sort(), ['emphasis', 'strong']);
      assert.ok((intro.appearance.parameters.nodes ?? ['heading']).includes('heading'), 'headings must stay enabled');

      const tiers = field(page, 'tiers');
      assert.equal(tiers.field_type, 'rich_text');
      assert.deepEqual(tiers.validators.rich_text_blocks.item_types, [tier.id]);
      assert.ok(tiers.validators.size?.min === 1 && tiers.validators.size?.max === 4, 'tiers must hold 1 to 4 blocks');

      const logos = field(page, 'logos');
      assert.equal(logos.field_type, 'gallery');
      assert.equal(logos.validators.size?.min, 2, 'logos needs at least 2 assets');
      assert.ok(['image', 'transformable_image'].includes(logos.validators.extension?.predefined_list), 'logos must be images only');
      assert.equal(logos.validators.required_alt_title?.alt, true, 'alt text must be mandatory');

      const features = field(page, 'features');
      assert.equal(features.field_type, 'json');
      assert.ok(['string_multi_select', 'string_checkbox_group'].includes(editor(features)), 'features must use a multi-select or checkbox-group editor');
      assert.deepEqual(features.appearance.parameters.options.map((option) => option.value).sort(), ['audit_log', 'sla', 'sso']);

      const color = field(page, 'accent_color');
      assert.equal(color.field_type, 'color');
      assert.equal(editor(color), 'color_picker');
      assert.deepEqual(color.appearance.parameters.preset_colors.map((preset) => preset.toUpperCase()).sort(), ['#1D1D1D', '#FF7751']);
      assert.ok(!color.appearance.parameters.enable_alpha, 'no transparency control');

      const owner = field(page, 'owner');
      assert.equal(owner.field_type, 'link');
      assert.ok(owner.validators.required, 'owner is required');
      assert.deepEqual(owner.validators.item_item_type.item_types, [ID.author]);
      assert.equal(owner.validators.item_item_type.on_reference_delete_strategy, 'fail', 'deleting a linked author must be refused');
    },
  },
];
