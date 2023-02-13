# deferred(cb)

Insert a value whose calculation is performed later, when it is actually needed  

```js
  const output = {
    results: loadRecords(),
    meta: deferred(async () => {
      /* generate */
    })
  };
```

## Parameters

`cb` - `<AsyncFunction>`

## Notes

`deferred` just sticks the callback into an object as its `onJSON` handler.