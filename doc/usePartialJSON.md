# usePartialJSON(url, options = {}) 

Return a portion of a JSON object located at a remote server using 
[HTTP range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)

## Syntax

```js
function Widget({ url }) {
  const [ { results }, more ] = usePartialJSON(url, { partial: 'results', chunkSize: 100 * 1024 });
  /* ... */
}
```

## Parameters

* `url` - `<string>` URL of the remote JSON object
* `options` - `{ delay, partial }`
* `return` - `<array>` or `<object>`

## Options

* `chunkSize` - `<number>` The number of bytes to fetch in one request (Default: `5120`)
* `delay` - `<number>` Time interval in millisecond between component updates (Default: `100`)
* `maxRetries` - `<number>` Maximum number of retries after encountering an error that is 
* `partial` - `<string>` or `<string[]>` The path to the sub-object that can be partially retrieved (Default: `""`)
* `retryInterval` - `<number>` Number of milliseconds to wait between retries (Default: `30000`)

## Notes

`usePartialJSON` will throw if the fetch operation encounters an error (if the server does not 
support range requests, for instance). Catch the error using a React error boundary.

The hook relies on [React-seq](https://github.com/chung-leong/react-seq#readme).

SeeConsult [documentation of React-seq](https://github.com/chung-leong/react-seq/blob/main/doc/defer.md#deferment-explained)
for an explanation of how `delay` affects the component update frequency.