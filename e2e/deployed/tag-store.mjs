import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

// A persistent SQLite-backed external dependency for deployed cache tests.
// The website cache and invalidation remain real Next.js/Vercel operations.
export function createTagStore({ database, token, observe = () => {} }) {
  const db = new DatabaseSync(database);
  db.exec('CREATE TABLE IF NOT EXISTS tags (query_id TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY(query_id, tag))');
  let unavailable = false;
  const server = createServer(async (request, response) => {
    const send = (status, body) => { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)); };
    if (request.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'Unauthorized' });
    if (unavailable) { observe({ operation: 'unavailable', path: request.url }); return send(503, { error: 'Unavailable' }); }
    try {
      let text = '';
      for await (const chunk of request) { text += chunk; if (text.length > 1000000) return send(413, { error: 'Too large' }); }
      const body = JSON.parse(text);
      if (!Array.isArray(body.tags) || body.tags.some(tag => typeof tag !== 'string' || !tag)) return send(400, { error: 'Invalid tags' });
      if (request.method === 'PUT' && request.url === '/mapping') {
        if (typeof body.queryId !== 'string' || !body.queryId) return send(400, { error: 'Invalid queryId' });
        db.exec('BEGIN');
        try {
          db.prepare('DELETE FROM tags WHERE query_id = ?').run(body.queryId);
          const insert = db.prepare('INSERT OR IGNORE INTO tags VALUES (?, ?)');
          for (const tag of body.tags) insert.run(body.queryId, tag);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        observe({ operation: 'store', queryId: body.queryId, tags: body.tags });
        return send(200, { stored: true });
      }
      if (request.method === 'POST' && request.url === '/lookup') {
        const lookup = db.prepare('SELECT query_id FROM tags WHERE tag = ?');
        const queryIds = [...new Set(body.tags.flatMap(tag => lookup.all(tag).map(row => row.query_id)))];
        observe({ operation: 'lookup', tags: body.tags, queryIds });
        return send(200, { queryIds });
      }
      send(404, { error: 'Not found' });
    } catch { send(400, { error: 'Invalid request' }); }
  });
  return { server, setUnavailable(value) { unavailable = value; }, rows() { return db.prepare('SELECT * FROM tags ORDER BY query_id, tag').all(); }, close() { server.close(); db.close(); } };
}
