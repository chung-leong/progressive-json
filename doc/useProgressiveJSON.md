# useProgressiveJSON(url, options = {}) 

Return a JSON object located at a remote server progressively

## Syntax

```js
function Widget({ url }) {
  const { results } = useProgressiveJSON(url, { partial: 'results' });
  /* ... */
}
```

## Parameters

* `url` - `<string>` URL of the remote JSON object
* `options` - `{ delay, partial }`
* `return` - `<array>` or `<object>`

## Options

* `delay` - `<number>` Time interval in millisecond between component updates (Default: `100`)
* `maxRetries` - `<number>` Maximum number of retries after encountering an error that is 
* `partial` - `<string>` or `<string[]>` The path to the sub-object that can be partially retrieved (Default: `""`)
* `retryInterval` - `<number>` Number of milliseconds to wait between retries (Default: `30000`)

## Notes

`useProgressiveJSON` returns an empty array initially.

`useProgressiveJSON` will throw if the fetch operation encounters an error. Catch the error using 
a React error boundary.

The hook relies on [React-seq](https://github.com/chung-leong/react-seq#readme).

SeeConsult [documentation of React-seq](https://github.com/chung-leong/react-seq/blob/main/doc/defer.md#deferment-explained)
for an explanation of how `delay` affects the component update frequency.
