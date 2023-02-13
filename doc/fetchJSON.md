# fetchJSON(url, options = {})

## Syntax

```js
  let offset = 0;
  for await (const { results = [] } of fetchJSON(url, { partial: 'results' })) {
    const newItems = results.slice(offset);
    offset += newItems.length;
    /* ... */
  }
```