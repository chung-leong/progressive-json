import { useState } from 'react';
import { useArraySlice, usePartialJSON, getJSONProgress } from 'progressive-json';
import FoodDescription from './FoodDescription.js';

export default function PaginatedList({ url, field }) {
  const [ page, setPage ] = useState(1);
  const partial = field;
  const chunkSize = 250 * 1024;
  const [ json, more ] = usePartialJSON(url, { partial, chunkSize });
  const { loaded, total } = getJSONProgress(json);
  const list = json[field] ?? [];
  const perPage = 5;
  const pageTotal = (loaded >= total) ? Math.ceil(list.length / 5) : Infinity;
  const slice = useArraySlice(list, (page - 1) * perPage, [ page * perPage, +1 ], more);

  return (
    <ul className="PaginatedList">
      <div className="navigation">
        <button onClick={() => setPage(n => n - 1)} disabled={page <= 1}>&#x25C0;</button>     
        <span>Page {page}</span>
        <button onClick={() => setPage(n => n + 1)} disabled={page >= pageTotal}>&#x25B6;</button>     
      </div>
      {slice.map((item, index) => {
        return <FoodDescription key={index} info={item} />;
      })}
    </ul>
  );
}
