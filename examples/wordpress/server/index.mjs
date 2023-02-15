import Fastify from 'fastify';
import Etag from '@fastify/etag';
import Static from '@fastify/static';
import Caching from '@fastify/caching';
import Compression from '@fastify/compress';
import CORS from '@fastify/cors';
import { createPool } from 'mysql2';
import { query } from './mysql-query.mjs';

const { pathname: buildPath } = new URL('../build', import.meta.url);

(async () => {
  // create MySQL connection pool
  const pool = mysql.createPool({
    host: '172.129.0.4',
    user: 'wordpress',
    password: 'password',
    database: 'wordpress',
    waitForConnections: true,
    connectionLimit: 10,
  });  

  const fastify = Fastify({ ignoreTrailingSlash: true, trustProxy: true });
  // use automatic etag generation
  await fastify.register(Etag);
  // use cache control
  await fastify.register(Caching, { privacy: 'public', expiresIn: 300 });
  // use compression
  await fastify.register(Compression);
  // allow CORS
  await fastify.register(CORS, { origin: true });
  // add sendFile() to reply object
  await fastify.register(Static, { root: buildPath });
  // register routes
  fastify.get('/api/posts', async (req, reply) => {
    const { 
      page = 1, 
      per_page: perPage = 10,
    } = req.query;
    const mysql = query(pool);
    const ids = await mysql.all`
      SELECT id FROM wp_posts 
      WHERE post_type = 'post'
      ORDER BY post_date DESC 
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `;
    const authors = await mysql.all`
      SELECT * FROM wp_users W
    `;
  });
  // start listening for requests
  await fastify.listen({ host: 'localhost', port: 8080 });
  console.log(`Running test website at http://localhost:8080/`);
})();
