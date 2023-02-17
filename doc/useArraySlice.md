# useArraySlice(array, start, end, more)

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
* `end` - `<number>` or `<number[2]>` Zero-based index at which to end extraction (exclusive)
* `more` - `<Function>` Callback function for requesting more items 
* `return` `<any[]>`

## Notes

The return value is memoized. It changes only if `array`, `start`, or `end` is different.

If `end` is an array of two numbers, the first number is the end index, while the second number 
is the number of extra items the hook customer wishes to preload. For example:

```js
function Widget({ url, perPage = 50 }) {
  const [ page, setPage ] = useState(1);
  const [ { results }, more ] = usePartialJSON(url, { chunkSize: 100 * 1024, partial: 'results' });
  const products = useArraySlice(results, (page - 1) * perPage, [ page * perPage, +2 ], more);
  /* ... */
}
```

The code above requests two extra items to be fetched, such that a jump to the next page would 
not result in an empty list momentarily.