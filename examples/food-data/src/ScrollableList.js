import { useEffect, useRef } from 'react';
import { usePartialJSON, getJSONProgress } from 'progressive-json';
import FoodDescription from './FoodDescription.js';

export default function ScrollableList({ url, field }) {
  const partial = `${field}.#.foodNutrients`;
  const [ json, more ] = usePartialJSON(url, { partial });
  const list = json[field] ?? [];
  const { loaded, total } = getJSONProgress(json);

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
  return (
    <ul className="ScrollableList">
      {list.map((item, index) => <FoodDescription key={index} info={item} />)}
      <div ref={bottom} className="bottom"></div>
      <progress value={loaded} max={total} />
    </ul>
  );
}
