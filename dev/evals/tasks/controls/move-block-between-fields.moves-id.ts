// Wrong: moves the block by putting its ID in the other field.
import { type Client } from '@datocms/cma-client-node';
import * as Schema from './schema';

export default async function (client: Client): Promise<void> {
  const page = await client.items.find<Schema.LandingPage>('BmmQXzYKTUqzp8lreCg80g');
  const quoteId = page.sections[2];
  if (!quoteId) throw new Error('No third block');
  await client.items.update<Schema.LandingPage>(page.id, {
    sections: page.sections.filter((id) => id !== quoteId),
    sidebar: [quoteId, ...page.sidebar],
  });
}
