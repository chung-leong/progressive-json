# useArraySlice(array, start, end, more)

Return a portion of an array, invoking the callback function if there aren't sufficient number of 
items to satisfy the request

## Syntax

```js
function Widget({ url, perPage = 50 }) {
  const [ page, setPage ] = useState(0);
  const [ { results }, more ] = usePartialJSON(url, { chunkSize: 100 * 1024, partial: 'results' });
  const products = useArraySlice(results, page * perPage, (page + 1) * perPage, more);
  /* ... */
}
```

## Parameters

* `array` - `<any[]>` The array to copy from
* `start` - `<number>` Zero-based index at which to start extraction
* `end` - `<number>` Zero-based index at which to end extraction (exclusive)
* `more` - `<Function>` Callback function for requesting more items 
* `return` `<any[]>`

## Notes

The return value is memoized. It changes only if `array`, `start`, or `end` is different.
