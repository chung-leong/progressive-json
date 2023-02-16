# getJSONProgress(object)

Return the number of bytes loaded when the JSON snapshot was created as well as the total file size (if available)

## Syntax

```js
function Widget(url) {
  const [ list, more ] = usePartialJSON(url);
  const { loaded, total } = getJSONProgress(list);
  const perPage = 10;
  // the number of pages is known only if the file is fully loaded
  const pageCount = (loaded >= total) ? list.length / perPage : Infinity;
}
```

## Parameters

* `object` - `<object>` or `<array>` A JSON object returned by one of the library's functions
* `return` `{ loaded, total, end }`

## Notes

`end` is a string containing the end brackets used to complete a partially retrieved JSON object. 
It's empty for the final, complete object.

`getJSONProgress` returns an empty object when given an unknown object or a scalar.
