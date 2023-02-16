import Fastify from 'fastify';
import Static from '@fastify/static';
import Caching from '@fastify/caching';
import CORS from '@fastify/cors';
import { createJSONStream } from 'progressive-json/server';
import { createPool } from 'mysql2';
import { query } from './mysql-query.mjs';

const { pathname: buildPath } = new URL('../build', import.meta.url);

(async () => {
  // create MySQL connection pool
  const pool = createPool({
    host: '172.129.0.4',
    user: 'wordpress',
    password: 'wordpress',
    database: 'wordpress',
    waitForConnections: true,
    connectionLimit: 10,
  });  

  const fastify = Fastify({ ignoreTrailingSlash: true, trustProxy: true });
  // use cache control
  await fastify.register(Caching, { privacy: 'public', expiresIn: 300 });
  // allow CORS
  await fastify.register(CORS, { origin: true });
  // add sendFile() to reply object
  await fastify.register(Static, { root: buildPath });
  // register routes
  fastify.get('/api/posts', async (req, reply) => {
    const page = parseInt(req.query.page ?? '1');
    const perPage = parseInt(req.query.per_page ?? '10');
    const posts = loadPosts(pool, page, perPage);
    return createJSONStream(posts, undefined, 2);
  });
  fastify.get('/api-alt/posts', async (req, reply) => {
    const page = parseInt(req.query.page ?? '1');
    const perPage = parseInt(req.query.per_page ?? '10');
    const posts = loadPosts(pool, page, perPage);
    let list = [];
    for await (const post of posts ){
      list.push(post);
    }
    return list;
  });
  // start listening for requests
  await fastify.listen({ host: 'localhost', port: 8081 });
})();

async function* loadPosts(connection, page, perPage) {
  const mysql = query(connection);
  const [ postIds, authorIds ] = await mysql.columns`
    SELECT id, post_author 
    FROM wp_posts 
    WHERE post_type = 'post'
    ORDER BY post_date DESC 
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `;
  const authors = await mysql.all`
    SELECT * 
    FROM wp_users 
    WHERE id in (${authorIds})
  `;
  const rows = mysql`
    SELECT *
    FROM wp_posts
    WHERE id in (${postIds})
    ORDER BY FIELD(id, ${postIds})
  `;
  try {
    for await (const row of rows) {
      yield row;
    } 
  } catch (err) {
    console.log(err);
    yield err;
  }
}