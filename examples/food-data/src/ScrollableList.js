import { usePartialJSON } from 'progressive-json';

export default function ScrollableList({ url }) {
  const list = usePartialJSON(url);
  return (
    <pre>
      {JSON.stringify(list, undefined, 2)}
    </pre>
  );
}
