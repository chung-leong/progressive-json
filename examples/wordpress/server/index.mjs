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
  await fastify.register(Caching, { privacy: 'public', expiresIn: 5 });
  // allow CORS
  await fastify.register(CORS, { origin: true });
  // serve static files
  await fastify.register(Static, { root: buildPath });
  // register routes
  fastify.get('/api/posts', async (req, reply) => {
    const page = parseInt(req.query.page ?? '1');
    const perPage = parseInt(req.query.per_page ?? '10');
    const posts = loadPosts(pool, page, perPage);
    return createJSONStream(posts);
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
  await fastify.listen({ host: 'localhost', port: 8080 });
})();

async function* loadPosts(connection, page, perPage) {
  const mysql = query(connection);
  const [ postIds, authorIds ] = await mysql.columns`
    SELECT ID, post_author 
    FROM wp_posts 
    WHERE post_type = 'post'
    ORDER BY post_date DESC 
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `;
  const authors = await mysql.all`
    SELECT ID, display_name, user_nicename, user_url 
    FROM wp_users 
    WHERE ID IN (${authorIds})
  `;
  const termRelationships = await mysql.all`
    SELECT term_taxonomy_id, object_id
    FROM wp_term_relationships 
    WHERE object_id IN (${postIds})
    ORDER BY term_order
  `;
  const terms = await mysql.all`
    SELECT term_taxonomy_id, name, slug, taxonomy 
    FROM wp_term_taxonomy TT INNER JOIN wp_terms T ON T.term_id = TT.term_id
    WHERE term_taxonomy_id IN (${termRelationships.map(r => r.term_taxonomy_id)})
  `;
  const posts = mysql`
    SELECT ID, post_title, post_date_gtm, post_content, post_author,  
    FROM wp_posts
    WHERE ID IN (${postIds})
    ORDER BY FIELD(ID, ${postIds})
  `;
  for await (const post of posts) {
    const postAuthor = authors.find(a => a.ID == post.post_author);
    const postRelationships = termRelationships.filter(r => r.object_id === post.ID);
    const postTermTaxIds = postRelationships.map(r => r.term_taxonomy_id);
    const postTerms = terms.filter(t => postTermTaxIds.includes(t.term_taxonomy_id));
    const postTags = postTerms.filter(t => t.taxonomy === 'post_tag');
    const postCategories = postTerms.filter(t => t.taxonomy === 'category');
    yield {
      id: post.ID,
      title: post.post_title,
      date: post.post_date_gtm,
      content: post.post_content,
      author: {
        name: postAuthor?.display_name,
        nicename: postAuthor?.user_nicename,
        url: postAuthor?.user_url,
      },
      categories: postCategories.map(({ name, slug }) => {
        return { name, slug };
      }),
      tags: postTags.map(({ name, slug }) => {
        return { name, slug };
      }),
    };
  }
}