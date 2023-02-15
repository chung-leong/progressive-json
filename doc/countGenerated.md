# countGenerated(generator)

Return a promise that will event be fulfilled with the number of items retrieved from the given generator

```js
  const results = loadRecords();
  const output = {
    results,
    count: countGenerated(results),
  };
  createJSONStream().pipe(res);
```

## Parameter

* `generator` - `AsyncGenerator` The generator whose output count is desired
* `return` `<Promise>` A promise of the eventual output count

## Note

`countGenerated` spies on the generator's `next` method. It has to be called prior to any
retrieval operation.

A deadlock will occur in [`createJSONStream`](./createJSONStream.md) if the promise returned by this function is 
positioned ahead of the generator:

```js
  const results = loadRecords();
  const output = {
    count: countGenerated(results), // promise never filfills
    results,                        // generate is not reachable
  };
  createJSONStream().pipe(res);
```
