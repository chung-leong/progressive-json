import { useProgressiveJSON, getJSONProgress } from 'progressive-json';
import { useEffect, useMemo, useState } from 'react';
import './css/App.css';

export default function App() {
  const counts = [ 10, 50, 100, 250, 500, 1000, 2000 ];
  return (
    <div className="App">
      {counts.map(count => (
        <div key={count}>
          <ResponseTime url={`/api/posts?per_page=${count}`} />
          <ResponseTime url={`/api-alt/posts?per_page=${count}`} />
        </div>
      ))}
    </div>
  );
}

function ResponseTime({ url }) {
  const [ running, setRunning ] = useState(false);
  const items = useProgressiveJSON(running && url, { delay: 0 });
  const [ startTime, setStartTime ] = useState();
  const [ firstItemDuration, setFirstItemDuration ] = useState();
  const [ totalDuration,  setTotalDuration ] = useState();
  const content = useMemo(() => {
    if (running) {
      return `${firstItemDuration ?? '-'} / ${totalDuration ?? '-'}`;
    } else {
      return <span className="button" onClick={() => setRunning(true)}>&#x25B6;</span>;
    }
  }, [ running, firstItemDuration, totalDuration ]);
  const title = /-alt/.test(url) ? 'Non-streaming' : 'Streaming';
  useEffect(() => {
    if (running) {
      const now = new Date();
      if (!startTime) {
        setStartTime(now);
      } else if (!firstItemDuration && items.length > 0) {
        setFirstItemDuration(`${now - startTime} ms`);
      } else {
        const { end } = getJSONProgress(items);
        if (!end) {
          setTotalDuration(`${now - startTime} ms`);
        }
      }
    }
  }, [ items, running, startTime, firstItemDuration ]);
  return (
    <div className="ResponseTime">
      <div className="title">{title}</div>
      <div className="url">{url}</div>
      <div className="duration">{content}</div>
    </div>
  );
}