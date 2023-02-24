# useArraySlice(array, start, end, options = {})

Return a portion of an array, invoking the callback function if there aren't sufficient number of 
items to satisfy the request

## Syntax

```js
function Widget({ url, perPage = 50 }) {
  const [ page, setPage ] = useState(1);
  const [ { results }, more ] = usePartialJSON(url, { chunkSize: 100 * 1024, partial: 'results' });
  const products = useArraySlice(results, (page - 1) * perPage, page * perPage, more);
  /* ... */
}
```

## Parameters

* `array` - `<any[]>` The array to copy from
* `start` - `<number>` Zero-based index at which to start extraction
* `end` - `<number>` Zero-based index at which to end extraction (exclusive)
* `options` - `{ extra, filter, map, more }` or `<Function>` 
* `return` `<any[]>`

## Options

* `extra`  - Number of extra items (default 0)
* `filter` - Callback function for [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
* `map` - Callback function for [Array.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
*  `more` Callback function for retrieving additional items when there aren't 
sufficient number of them 

## Notes

When the fourth parameter is a function, it's used as `more`.

The return value is memoized. It changes only if `array`, `start`, `end`, or `extra` is different.

If both `filter` and `map` are provided, filtering always occurs first.

`extra` is used for preloading items:

```js
function Widget({ url, perPage = 50 }) {
  const [ page, setPage ] = useState(1);
  const [ { results }, more ] = usePartialJSON(url, { chunkSize: 100 * 1024, partial: 'results' });
  const start = (page - 1) * perPage;
  const end = page * perPage;
  const products = useArraySlice(results, start, end, { extra: 2, more });
  /* ... */
}
```

The code above requests two extra items to be fetched, so that a jump to the next page would 
not result in an empty list.