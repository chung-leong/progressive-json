# countGenerated(generator)

Create an object with a [`toJSON`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior)
method that yields the number of items retrieved from the given generator.

```js
  const results = loadRecords();
  const output = {
    results,
    count: countGenerated(results),
  };
  createJSONStream().pipe(res);
```

## Note

`countGenerated` spies on the generator's `next` method. It needs to be called prior to any
retrieval operation on the generator.

The returned object's `toJSON` method will throw if it's called before all items have been
taken from the generator.