// Freeze tasks and checks before running the candidate. No task names a skill.
// These cases ran on 2026-09-19 and are now regressions, not held out or author-blinded.
export const cases = [
  {
    id: 'asset-cli', fixture: 'utility', check: 'cli',
    files: {
      'datocms.config.json': JSON.stringify({ profiles: { studio: { logLevel: 'BODY', migrations: { directory: './migrations' } } } }),
      'README.md': 'Editorial utilities. Use pnpm exec datocms with our existing studio profile. Authentication is already linked.\n',
    },
    prompt: 'Give me commands only, without running them or changing files. In this existing DatoCMS CLI project, first show the API reference for retrieving upload asset_47 and the full TypeScript types for creating an upload. Then show the one-off call to retrieve asset_47 from environment photo-review with our studio profile. Use our pnpm convention. No login or configuration changes are needed.',
    rubric: ['Public documentation commands parse without project flags', 'Documentation uses uploads self/create and supported type expansion', 'Project read resolves upload asset_47 with studio profile and photo-review environment', 'No writes, authentication, or project calls'],
  },
  {
    id: 'collection-links', fixture: 'vite', check: 'links',
    files: {
      'src/components/Collection.tsx': `export type Entry = { id: string; heading: string; badge: string; image: { url: string; alt: string }; curator: string; count: number; _editingUrl: string };
export default function Collection({ entries }: { entries: Entry[] }) {
  return <ul className="collection">{entries.map(entry => <li key={entry.id} data-entry={entry.id}>
    <img src={entry.image.url} alt={entry.image.alt} />
    <span className="badge">{entry.badge}</span><h2>{entry.heading}</h2>
    <footer><span className="curator">{entry.curator}</span><span className="count">{entry.count}</span></footer>
  </li>)}</ul>;
}
`,
    },
    prompt: 'Our DatoCMS preview query and the page-level editing controller already work. Please adapt src/components/Collection.tsx so the spare area of each collection row edits its heading. The image and curator should each edit their own field, and the numeric count should use that entry’s _editingUrl. Heading, badge, image.alt and curator include invisible editing metadata. Badges are labels only: keep them plain, and add a clean lowercase data-badge on each row for filtering. Keep the current component API, classes, content and row order. Do not add another controller or change the query or dependencies.',
    rubric: ['Production build succeeds', 'Real controller resolves independent row, image, curator and count targets for multiple records', 'Badges render plain and filter correctly', 'No collisions, response-wide metadata removal, second controller or unrelated changes'],
  },
  {
    id: 'astro-1', fixture: 'astro', check: 'preview',
    files: {
      '.env.example': 'SECRET_API_TOKEN=\nSIGNED_COOKIE_JWT_SECRET=\nDATOCMS_DRAFT_CONTENT_CDA_TOKEN=\nDRAFT_MODE_COOKIE_NAME=datocms_preview\n',
    },
    prompt: 'Editors need to open draft preview on this existing Astro site. Add /api/draft-mode/enable with token and redirect query parameters, and /api/draft-mode/disable without a password. The enable endpoint must verify the runtime secret; redirects must stay on our site while preserving the chosen path, query and fragment. Preview should work inside the embedded DatoCMS editor, with a signed datocms_preview cookie that disable clears. The deployment supplies the variables listed in .env.example. Use the Node standalone adapter and keep the current homepage. Install needed packages and check the production build. Only implement these preview endpoints and their helpers; content fetching and the editor panel configuration are handled elsewhere. No deployment or CMS connection is needed.',
    rubric: ['Existing upstream homepage remains intact', 'Production server accepts valid preview and rejects bad credentials and unsafe redirects', 'Embedded cookie flags, signed session and disable work', 'Missing-secret deployment fails closed', 'No extra feature bundle'],
  },
  {
    id: 'document-rename', fixture: 'utility', check: 'document',
    files: {
      'src/content/replaceBrand.ts': `import type { Document } from 'datocms-structured-text-utils';
// The caller passes a DatoCMS DAST document, not a record or API envelope.
export function replaceBrand(document: Document, from: string, to: string): Document {
  return JSON.parse(JSON.stringify(document).replaceAll(from, to));
}
`,
    },
    prompt: 'Fix src/content/replaceBrand.ts. We rename brands in DatoCMS Structured Text, but this helper also rewrites record IDs and link URLs when they contain the brand. Replace exact, case-sensitive occurrences only inside ordinary prose spans, including linked text and nested lists. Leave code blocks, URLs, link metadata, marks, styles, block and inline-record references untouched. Keep the public function signature and return a separate document without mutating the input. Treat an empty search string as a no-op. This is an offline utility; no project access is needed.',
    rubric: ['DAST validates after edits', 'Nested prose changes while references, code, marks and metadata survive', 'Input remains unchanged', 'No CMS/CLI setup or unrelated files'],
  },
  {
    id: 'modeling-advice', fixture: 'utility', check: 'review',
    files: { 'brief.md': 'Museum network: exhibits are shared by several venues and reused in a kiosk app. Curators arrange pages independently. Taxonomy has broader/narrower terms. Existing data must remain intact.\n' },
    prompt: 'We are planning a DatoCMS schema for the museum network described in brief.md. Should exhibits, venue page sections and taxonomy terms be records or embedded blocks? Propose a small starting model that supports reuse, per-page order, localized descriptions and a manageable editor experience. Explain the important tradeoffs and any questions you would settle before migrating existing data. Advice only; do not create files, connect to a project or implement the schema.',
    rubric: ['Reusable exhibits and taxonomy are references, local composition uses ordered blocks', 'Models separate shared content from presentation and support localization', 'Addresses taxonomy hierarchy, editorial controls and migration unknowns', 'No implementation, connection or speculative schema expansion'],
  },
  {
    id: 'notice-navigation', fixture: 'vite', check: 'notice',
    files: {
      'src/components/NoticeBanner.tsx': `export type Notice = { heading: string; audience: string; body: string; href: string };
export default function NoticeBanner({ notice }: { notice: Notice }) {
  return <section className="notice"><p className="audience">{notice.audience}</p><h2><a href={notice.href}>{notice.heading}</a></h2><p className="body">{notice.body}</p></section>;
}
`,
    },
    prompt: 'Make src/components/NoticeBanner.tsx work with our existing DatoCMS click-to-edit preview. Clicking the spare banner area should select the heading, while its body remains independently editable. The audience is a display-only label and must be plain text. In preview all four incoming strings contain editing metadata; on the published site they are ordinary strings. The heading link must still navigate to its original URL, including query and fragment, in both modes. Preserve the component API, classes, visible text and normal link behavior. Query options and the root controller are already configured; only change this component.',
    rubric: ['Production build succeeds', 'Heading owns banner and body edits independently', 'Display-only text and navigation URL are clean', 'Published strings still render and navigate normally', 'No second controller, query change or unrelated edits'],
  },
  {
    id: 'ordinary-counter', fixture: 'vite', check: 'counter',
    files: { 'src/lib/cms.ts': 'export const contentBackend = "DatoCMS";\n' },
    prompt: 'On this starter homepage, change the counter so each click adds two instead of one and add a Reset button that returns it to zero. Keep the rest of the page unchanged. Please implement it and check the build.',
    rubric: ['Production build and interactive counter/reset work', 'Unrelated homepage content is retained', 'Does not start a CMS workflow just because this repository uses DatoCMS'],
  },
];
