# WordPress database example

This example demonstrates the use of [`createJSONStream`](../../doc/createJSONStream.md) on 
the server-side. We'll examine how streaming a JSON object can help improve response time.
As a test database, we'll use site data from an instance of WordPress, running alongside 
MySQL (MariaDB, actually) in Docker.

## Seeing the code in action

Follow these steps if you wish to see the code running on your own computer:

1. Run `git clone https://github.com/chung-leong/progressive-json.git`
2. Run `cd progressive-json/examples/wordpress; npm ci; npm run build`
3. Run `cd server; docker-compose up -d`
4. Open browser, go to `http://172.129.0.5` and finish WordPress set-up
5. In WordPress admin, install the FakerPress plugin.
6. Use FakerPress to create test users, tags, and posts.
7. Run `node index.mjs`  
8. Go to `http://localhost:8080/`

## The server script

The [test server](./server/index.mjs) is initiated using an IIAFE. A MySQL connection pool 
is the first thing we create:  

```js
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
```

Then we set up [Fastify](https://www.fastify.io/), along with some useful 
plugins:

```js
  const fastify = Fastify({ ignoreTrailingSlash: true, trustProxy: true });
  // use cache control
  await fastify.register(Caching, { privacy: 'public', expiresIn: 5 });
  // allow CORS
  await fastify.register(CORS, { origin: true });
  // serve static files
  await fastify.register(Static, { root: buildPath });
```

We register a route for retrieving posts:

```js
  // register routes
  fastify.get('/api/posts', async (req, reply) => {
    const page = parseInt(req.query.page ?? '1');
    const perPage = parseInt(req.query.per_page ?? '10');
    const posts = loadPosts(pool, page, perPage);
    return createJSONStream(posts);
  });
```

Here's where `createJSONStream` gets called. Fastify allows us to simply return the stream. With 
the more archaic Express.js we'd need to do `createJSONStream(posts).pipe(res)`.

We register a second, alternative route that does things differently:

```js
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
```

Finally the server starts listening for request:

```js
  // start listening for requests
  await fastify.listen({ host: 'localhost', port: 8080 });
})();

## The loadPosts function

[loadPosts](./server/index.js#L49) is an async generator function. The first thing 
that is it does is create a helper function attach to the database connection that 
will help us create and execute SQL statement:

```js
async function* loadPosts(connection, page, perPage) {
  const mysql = query(connection);
```

Then it query for the matching posts, retrieving just the post ids and author ids:

```js
  const [ postIds, authorIds ] = await mysql.columns`
    SELECT ID, post_author 
    FROM wp_posts 
    WHERE post_type = 'post'
    ORDER BY post_date DESC 
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `;
```

With the author ids, it loads the author records:

```js
  const authors = await mysql.all`
    SELECT ID, display_name, user_nicename, user_url 
    FROM wp_users 
    WHERE ID IN (${authorIds})
  `;
```

Then it loads the tag and category records:

```js
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
```

Finally, it queries for the content of the posts, using the ids obtained earlier:

```js
  const posts = mysql`
    SELECT ID, post_title, post_date_gtm, post_content, post_author,  
    FROM wp_posts
    WHERE ID IN (${postIds})
    ORDER BY FIELD(ID, ${postIds})
  `;
```

Unlike `mysql.columns` and `mysql.all`, which return promises, `mysql` proper returns 
an object stream, that yields rows as they're fetched from the database. It's async 
iterable like all Node streams. We iterate through it to attach information from 
the author, tag, and category records we had fetched earlier:

```js
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
```
