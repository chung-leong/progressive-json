# Food Data Example

This example demonstrates how you can use [`usePartialJSON`](../../doc/usePartialJSON.md) to present 
data from a large JSON file. We'll examine a pair of React components. One implements continuous
(or "infinite") scrolling, while the other employs more traditional pagination.

The data source is a 68-meg JSON file from the 
[USDA](https://fdc.nal.usda.gov/download-datasets.html) containing information about food nutrients.

## Live Demo

You can see the example in action [here](https://chung-leong.github.io/progressive-json/food-data/). 
Use the buttons at the top to switch between the two component types.

## ScrollableList

The [`ScrollableList`](./src/ScrollableList.js:L6) component starts out by calling 
[`usePartialJSON`](../../doc/usePartialJSON.md):

```js
export default function ScrollableList({ url, field }) {
  const partial = `${field}.#.foodNutrients`;
  const [ json, more ] = usePartialJSON(url, { partial });
  const list = json[field] ?? [];
```

For some strange reason, the USDA decided to use unique field names for different data sets. 
For the file in question, `FoodData_Central_survey_food_json_2022-10-28.json`, the field 
name is "SurveyFoods". `json.SurveyFoods` is an array of objects, each describing a particular 
food item available on the market. Within each object is `foodNutrients`, also an array of 
objects: 

```js
{
  SurveyFoods: [
    {
      foodNutrients: [
        { ... },
        { ... },
        { ... },
      ], 
    }
  ]  
}
```

As the nutrient lists are fairly long, we instruct Progress-JSON to allow it to be returned 
partially. The nature of the UI means that missing items can be tolerated. When the user 
scrolls down, the rest of the list will get fetched.

After obtaining the JSON snapshot from `usePartialJSON`, the component calls 
[`getJSONProgress`](../../doc/getJSONProgress.md) to obtain numbers for its progress 
bar:

```js
  const { loaded, total } = getJSONProgress(json);
```

Then it creates an [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) in a useEffect hook to check when the page bottom gets near:  

```js
  // call more() when the bottom gets close enough to the viewport
  const bottom = useRef();
  useEffect(() => {
    const observer = new IntersectionObserver(more, {
      root: bottom.current.parentNode.parentNode,
      rootMargin: '0px 0px 100% 0px',
      threshold: 0
    });
    observer.observe(bottom.current);
    return () => {
      observer.disconnect();
    };
  }, [ more ]);
```

When the user scrolls within one page length of reaching the bottom, the `more` function from 
`usePartialJSON` gets called, causing another 50K chunk of the JSON file to be loaded through 
an [HTTP range request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests).

Finally, you see the rendering code:

```js
  return (
    <ul className="ScrollableList">
      {list.map((item, index) => <FoodDescription key={index} info={item} />)}
      <div ref={bottom} className="bottom"></div>
      <progress value={loaded} max={total} />
    </ul>
  );
}
```

Standard React stuff. Nothing particularly noteworthly about 
[`FoodDescription`](./src/FoodDescription.js) either, aside from the fact that it's 
memoized to improve performance.

## PaginatedList

The [`PaginatedList`](./src/PaginatedList.js#L6) starts out largely in the same way, by calling 
`usePartialJSON`:

```js
export default function PaginatedList({ url, field }) {
  const partial = field, chunkSize = 250 * 1024;
  const [ json, more ] = usePartialJSON(url, { partial, chunkSize });
  const list = json[field] ?? [];
  const { done, loaded, total } = getJSONProgress(json);
```

As there is no load-on-scroll mechanism here, only the top level array can be partial. We're also 
using a larger chunk size, enough for five or six food items.

Next, the component sets up some variables for pagination purpose:

```js
  const [ page, setPage ] = useState(1), perPage = 5;
  const pageTotal = (done) ? Math.ceil(list.length / perPage) : Infinity;
```

Then it uses [`useArraySlice`](../../doc/useArraySlice.md) to obtain the array slice 
cooresponding to the current page: 

```js
  const slice = useArraySlice(list, (page - 1) * perPage, page * perPage, { more, extra: 1 });
```

The `extra` option tells the hook to fetch one extra item than needed. We want to make sure 
that the component has something to show immediately when the user clicks the next button. 
Helps make the jump feel instantaneous.   

Finally, the rendering code:

```js
  return (
    <ul className="PaginatedList">
      <div className="navigation">
        <button onClick={() => setPage(n => n - 1)} disabled={page <= 1}>&#x25C0;</button>     
        <span>Page {page}</span>
        <button onClick={() => setPage(n => n + 1)} disabled={page >= pageTotal}>&#x25B6;</button>     
      </div>
      {slice.map((item, index) => <FoodDescription key={index} info={item} />)}
      <progress value={loaded} max={total} />
    </ul>
  );
}
```

Again, nothing special.

## Final thoughts

Well, that's it. I hope that you find this example useful and that it has motivated you 
to give the library a try.
