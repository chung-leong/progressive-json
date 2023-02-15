import { usePartialJSON, useArraySlice } from 'progressive-json';

export default function PaginatedList({ url }) {
  const list = usePartialJSON(url);
  return (
    <pre>
      {JSON.stringify(list, undefined, 2)}
    </pre>
  );
}
