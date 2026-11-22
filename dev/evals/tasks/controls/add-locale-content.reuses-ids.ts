// Wrong: reuses the English block IDs under the Italian locale.
import { type Client } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g');
  await client.items.update<Schema.LandingPage>(page.id, {
    tagline: { ...page.tagline, it: 'Rilascia subito' },
    highlights: { ...page.highlights, it: page.highlights.en ?? [] },
  });
}
