// The DatoCMS project every task eval starts from: block models nested two
// levels deep, a localized Modular Content field, and a localized Structured
// Text field with blocks, inline blocks and record links.
export const ID = {
  button: 'RIFuGr4yRHSTQ0R8OGuang',
  hero: 'FPy782oEQ362625s2KX3AA',
  oldBanner: 'cXTkLkUNTmqWxMtvjy-bxg',
  quoteCard: 'E5bl0d5MQVqi6D4fvAabfA',
  mention: 'SDRjfPPQTmSrr-4mIk87LA',
  cta: 'LDx0gpaSShiu83QHmkH9TA',
  author: 'F1Yf5tMRTCe9v_Csr-S72A',
  landingPage: 'fvahs81ATC-xwpd0XIlaNA',
  article: 'MAmcxx9FTfeBaF70qQFMTA',
  authorAda: 'MbaOLDn1SbeMRfFqkz-3_A',
  authorLin: 'b2vtVbCXTz-AFmqDgx7jRw',
  page: 'BmmQXzYKTUqzp8lreCg80g',
  articleRecord: 'W5gnRswJRyq3WQ6cKM68gg',
  hero1: 'GPxjvEdGRuylDmKvulEfnA',
  hero1Start: 'fRJvm6uEQCSPiz7G4b2Fow',
  hero1Learn: 'YaFoYerbSpyHM1jiZRaBiQ',
  banner1: 'OcbSE0uyQEiIWx0W_hSGUA',
  quote1: 'Lc4ovlbJTFic10YSHXhdkQ',
  hero2: 'DAj6noEoR16VhS7Uq9ytEQ',
  hero2Start: 'LS5IWnzBTIaIfwqLpeD5Zg',
  banner2: 'UPHYjsPGSNWe2rdmPTMczA',
  sidebarCta: 'GtNfIbMNSu6hfeqg8IV5mw',
  highlight1: 'e4wlEVTBRKiaTs8JJCat3w',
  highlight2: 'TtRrhQU-TqqPOxrIfIMG8g',
  bodyCta: 'YO6TjT-RTl6BHWM0T6l4og',
  bodyMention: 'DenrWccRRaS7wtcC-kxiFA',
  bodyQuote: 'CD0Qu0mdS_-Mvo7QA2pEPg',
  itBodyCta: 'Z09abbcyTRWvYOnbdcRr5A',
};

const FIELD_IDS = [
  'MFKKMJWgSPae7NaQhf60Zg', 'BhcGrRxhS4G58yD_lK_kMA', 'a-Lp-eCgQZGSuqeQHdqVwg', 'd1lOVaX-TpOWDoaz3mMnIA', 'UKFmkrVHRfSCRd-wpLu_2Q',
  'DVXX_NepTRi_ihi8QZVEDQ', 'BZgTmozDSAmk-Y5o7eqt1Q', 'TiJJaqSeTYGe57SX01Xzdw', 'Lh4nTnSVTeilEC8_EM03IQ', 'MHXBDm69QR-InbV9WixNyQ',
  'PmHdhnACRKuAXkZf-tnYBQ', 'W_ZqJkSnQYC8na4fAtUX1Q', 'IKhhAqmWS_aS2_1P7kHzLw', 'Yxmqy31yQSe1gqbFoPK9ig', 'aVbbHXiXSvyW-ldlMtsPKw',
  'VVZylTR4RS2SO3WZ8vxbJQ', 'LW0FOcgBRp6_tu4RwPiIdw', 'Kg8SwhkfRdiPzrPO8UeQjA', 'LThThKiRQCCJ7y74U4wB4w', 'KG2GqBM0TsKI6r8LYtydkA',
  'VGnZUxQERk2fkShBxdPhHw', 'YmEoLApLRESVjJI3JoAOhA', 'fNRF4XNhQo66lAS0hG-0vA', 'Et71vw9BTLmAXUz-g9VMZQ',
];

const block = (id, itemType, attributes) => ({ id, item_type: itemType, attributes });
const span = (value, marks) => (marks ? { type: 'span', value, marks } : { type: 'span', value });
const paragraph = (...children) => ({ type: 'paragraph', children });

export function magazine() {
  let next = 0;
  const field = (itemType, apiKey, fieldType, extra = {}) => ({
    id: FIELD_IDS[next++],
    item_type: itemType,
    label: apiKey.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
    api_key: apiKey,
    field_type: fieldType,
    localized: false,
    validators: {},
    ...extra,
  });
  const fields = [
    field(ID.button, 'label', 'string', { validators: { required: {}, length: { max: 30 } } }),
    field(ID.button, 'url', 'string', { validators: { required: {} } }),
    field(ID.button, 'style', 'string', { validators: { enum: { values: ['primary', 'secondary'] } } }),
    field(ID.hero, 'headline', 'string', { validators: { required: {} } }),
    field(ID.hero, 'subheadline', 'text'),
    field(ID.hero, 'ctas', 'rich_text', { validators: { rich_text_blocks: { item_types: [ID.button] }, size: { max: 3 } } }),
    field(ID.oldBanner, 'text', 'string'),
    field(ID.quoteCard, 'quote', 'text', { validators: { required: {} } }),
    field(ID.quoteCard, 'author_name', 'string'),
    field(ID.mention, 'handle', 'string', { validators: { required: {} } }),
    field(ID.cta, 'label', 'string', { validators: { required: {} } }),
    field(ID.cta, 'url', 'string', { validators: { required: {} } }),
    field(ID.author, 'name', 'string', { validators: { required: {} } }),
    field(ID.landingPage, 'title', 'string', { validators: { required: {} } }),
    field(ID.landingPage, 'tagline', 'string', { localized: true }),
    field(ID.landingPage, 'sections', 'rich_text', { validators: { rich_text_blocks: { item_types: [ID.hero, ID.oldBanner, ID.quoteCard, ID.cta] } } }),
    field(ID.landingPage, 'sidebar', 'rich_text', { validators: { rich_text_blocks: { item_types: [ID.cta, ID.quoteCard] } } }),
    field(ID.landingPage, 'highlights', 'rich_text', { localized: true, validators: { rich_text_blocks: { item_types: [ID.quoteCard] } } }),
    field(ID.article, 'title', 'string', { localized: true, validators: { required: {} } }),
    field(ID.article, 'summary', 'text', { localized: true }),
    field(ID.article, 'body', 'structured_text', {
      localized: true,
      validators: {
        structured_text_blocks: { item_types: [ID.cta, ID.quoteCard] },
        structured_text_inline_blocks: { item_types: [ID.mention] },
        structured_text_links: { item_types: [ID.author, ID.article] },
      },
    }),
    field(ID.article, 'featured', 'single_block', { validators: { single_block_blocks: { item_types: [ID.hero] } } }),
  ];

  const englishBody = {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        { type: 'heading', level: 1, children: [span('Why Acme ships faster')] },
        paragraph(span('At Acme we deploy '), span('every day', ['emphasis']), span('. Ask '), { type: 'inlineBlock', item: block(ID.bodyMention, ID.mention, { handle: 'ada' }) }, span(' how.')),
        { type: 'block', item: block(ID.bodyCta, ID.cta, { label: 'Try Acme', url: 'https://acme.example/signup' }) },
        { type: 'heading', level: 2, children: [span('The details')] },
        paragraph(span('Read the '), { type: 'link', url: 'https://acme.example/docs', children: [span('Acme docs')] }, span(' or the profile of '), { type: 'itemLink', item: ID.authorAda, children: [span('Ada')] }, span('.')),
        { type: 'list', style: 'bulleted', children: [{ type: 'listItem', children: [paragraph(span('Acme CLI'))] }, { type: 'listItem', children: [paragraph(span('Preview links'))] }] },
        { type: 'block', item: block(ID.bodyQuote, ID.quoteCard, { quote: 'We cut release time in half.', author_name: 'Lin' }) },
      ],
    },
  };
  const italianBody = {
    schema: 'dast',
    document: {
      type: 'root',
      children: [
        { type: 'heading', level: 1, children: [span('Perché Acme rilascia più in fretta')] },
        paragraph(span('In Acme rilasciamo ogni giorno.')),
        { type: 'block', item: block(ID.itBodyCta, ID.cta, { label: 'Prova Acme', url: 'https://acme.example/it/signup' }) },
      ],
    },
  };

  return {
    locales: ['en', 'it'],
    itemTypes: [
      { id: ID.button, name: 'Button', api_key: 'button', modular_block: true },
      { id: ID.hero, name: 'Hero', api_key: 'hero', modular_block: true },
      { id: ID.oldBanner, name: 'Old banner', api_key: 'old_banner', modular_block: true },
      { id: ID.quoteCard, name: 'Quote card', api_key: 'quote_card', modular_block: true },
      { id: ID.mention, name: 'Mention', api_key: 'mention', modular_block: true },
      { id: ID.cta, name: 'CTA', api_key: 'cta', modular_block: true },
      { id: ID.author, name: 'Author', api_key: 'author', draft_mode_active: true },
      { id: ID.landingPage, name: 'Landing page', api_key: 'landing_page', draft_mode_active: true },
      { id: ID.article, name: 'Article', api_key: 'article', draft_mode_active: true },
    ],
    fields,
    records: [
      { id: ID.authorAda, item_type: ID.author, attributes: { name: 'Ada' } },
      { id: ID.authorLin, item_type: ID.author, attributes: { name: 'Lin' } },
      {
        id: ID.page,
        item_type: ID.landingPage,
        attributes: {
          title: 'Launch',
          tagline: { en: 'Ship it' },
          sections: [
            block(ID.hero1, ID.hero, {
              headline: 'Build faster',
              subheadline: 'From idea to production',
              ctas: [
                block(ID.hero1Start, ID.button, { label: 'Get started', url: 'https://acme.example/start', style: 'primary' }),
                block(ID.hero1Learn, ID.button, { label: 'Learn more', url: 'https://acme.example/learn', style: 'secondary' }),
              ],
            }),
            block(ID.banner1, ID.oldBanner, { text: 'Summer sale' }),
            block(ID.quote1, ID.quoteCard, { quote: 'It just works.', author_name: 'Ada' }),
            block(ID.hero2, ID.hero, {
              headline: 'Scale with confidence',
              subheadline: '',
              ctas: [block(ID.hero2Start, ID.button, { label: 'Get started', url: 'https://acme.example/scale', style: 'primary' })],
            }),
            block(ID.banner2, ID.oldBanner, { text: 'Old promo' }),
          ],
          sidebar: [block(ID.sidebarCta, ID.cta, { label: 'Contact sales', url: 'https://acme.example/sales' })],
          highlights: {
            en: [
              block(ID.highlight1, ID.quoteCard, { quote: 'Fast.', author_name: 'Lin' }),
              block(ID.highlight2, ID.quoteCard, { quote: 'Reliable.', author_name: 'Ada' }),
            ],
          },
        },
      },
      {
        id: ID.articleRecord,
        item_type: ID.article,
        attributes: {
          title: { en: 'Why Acme ships faster', it: 'Perché Acme rilascia più in fretta' },
          summary: { en: 'How we release daily.', it: 'Come rilasciamo ogni giorno.' },
          body: { en: englishBody, it: italianBody },
          featured: null,
        },
      },
    ],
  };
}
