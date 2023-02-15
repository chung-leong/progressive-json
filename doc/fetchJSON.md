# fetchJSON(url, options = {})

Return an async generater that produces snapshots of a JSON object as portions of it 
arrive from a remote server

## Syntax

```js
  let prevResults;
  for await (const { results } of fetchJSON(url, { partial: 'results' })) {
    for (const [ index, result ] of results.entries()) {
      if (result !== prevResults?.[index]) {
        /* new result */
      }
    }
  }
```

## Parameters

* `url` - `<string>` URL of the remote JSON object
* `options` - `{ delay, maxRetries, partial, pause, retryInterval }`

## Options

* `chunkSize` - `<number>` The number of bytes to fetch in one request (Default: `5120`)
(Default: `undefined`)
* `maxRetries` - `<number>` Maximum number of retries after encountering an error that is 
temporary in nature (Default: `Infinity`)
* `partial` - `<string>` or `<string[]>` The path to the sub-object that can be partially retrieved (Default: `""`)
* `pause` - `<AsyncFunction>` A function that gets called after each HTTP range request
* `retryInterval` - `<number>` Number of milliseconds to wait between retries (Default: `30000`)
* `return` `<AsyncGenerator>`

## Notes

Transfer will start from the beginning again if the remote JSON changes in between 
range requests (i.e. a HTTP 412 error due to Etag mismatch).
