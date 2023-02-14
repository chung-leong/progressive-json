# deferred(cb)

Insert a value that is computed later, at the moment when it is needed  

```js
  const output = {
    results: loadRecords(),
    meta: deferred(async () => {
      /* generate metadata */
    })
  };
```

## Parameters

`cb` - `<AsyncFunction>` Callback that produces the eventual value

## Notes

`deferred` simply return an object with the callback as its `onJSON` handler.