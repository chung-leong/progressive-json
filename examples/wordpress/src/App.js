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
  const [ startTime, setStartTime ] = useState();
  const [ timeToFirst, setTimeToFirst ] = useState();
  const [ timeToLast,  setTimeToLast ] = useState();
  const title = /-alt/.test(url) ? 'Non-streaming' : 'Streaming';
  const content = useMemo(() => {
    if (running) {
      return `${timeToFirst ?? '-'} / ${timeToLast ?? '-'}`;
    } else {
      return <span className="button" onClick={() => setRunning(true)}>&#x25B6;</span>;
    }
  }, [ running, timeToFirst, timeToLast ]);
  const items = useProgressiveJSON(running && url, { delay: 0 });
  useEffect(() => {
    if (running) {
      const now = new Date();
      if (!startTime) {
        setStartTime(now);
      } else if (!timeToFirst && items.length > 0) {
        setTimeToFirst(`${now - startTime} ms`);
      } else {
        const { done } = getJSONProgress(items);
        if (done) {
          setTimeToLast(`${now - startTime} ms`);
        }
      }
    }
  }, [ items, running, startTime, timeToFirst ]);
  return (
    <div className="ResponseTime">
      <div className="title">{title}</div>
      <div className="url">{url}</div>
      <div className="duration">{content}</div>
    </div>
  );
}