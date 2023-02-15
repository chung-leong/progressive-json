# generateJSON(source, options = {})

Return an async generater that produces snapshots of a JSON object from a byte stream source.

## Syntax

```js
import { createReadStream } from 'node:fs';

async function importJSON(path) {
  const stream = createReadStream(path);
  let offset = 0;
  for (const { results } of generateJSON(stream, { partial: 'results' })) {
    const newResults = results.slice(offset);
    for (const result of newResults) {
      /* ... */
    }
    offset = results.length;
  }
}
```

## Parameters

* `source` - `<AsyncIterable>` An async-iterable resource yielding bytes as `<Uint8Array>`
* `options` - `{ partial, yieldClosingBrackets }`
* `return` `<AsyncGenerator>`

## Options

* `partial` - `<string>` or `<string[]>` The path to the sub-object that can be partially retrieved (Default: `""`)
* `yieldClosingBrackets` - `<boolean>` If true, the generator will yield arrays containing two items: the JSON object and a string containing the closing brackets used to complete 
the partial JSON  

