# createJSONStream(value, replacer = undefined, space = 0)

Create a Node.js stream that outputs a JSON string

## Syntax

Express.js:

```js
import { createJSONStream } from 'progressive-json/server';

/* ... */

app.get('/api/:table', (req, res) => {
  const { table } = req.params;
  const results = loadRecords(table);
  const stream = createJSONStream(results);
  stream.pipe(res);
});
```

Fastify:
```js
import { createJSONStream } from 'progressive-json/server';

/* ... */

fastify.get('/api/:table', async (req) => {
  const { table } = req.params;
  const results = loadRecords(table);
  return createJSONStream(results);
});
```

## Parameters

* `value` - `<AsyncGenerator>` or `<Generator>` or `<Promise>` or `<any>` The value to convert to a JSON string. It can be an ordinary JavaScript value or a special construct like async generator.
* `replacer` - `<Function>` or `<string[]>` A function that alters the behavior of the stringification process
* `space` - `<number>` A number that's used to insert white space into the output JSON string for readability purposes. Cannot be a string.
* `return` `<Readable>` A [Node.js stream](https://nodejs.org/api/stream.html#class-streamreadable)

Consult documentation of 
[JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) 
for more details about `replacer`.

## Notes

`createJSONStream` is capable of handling output from asynchronous `toJSON` methods. 

Use [`countGenerated`](./countGenerated.md) to send the number of items that a generator will 
eventually produce.

Use [`deferred`](./deferred.md) to send a value that will be calculated later, at the moment when 
it is needed.
