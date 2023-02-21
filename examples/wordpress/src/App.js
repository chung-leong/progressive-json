import { useProgressiveJSON } from 'progressive-json';
import { useEffect, useState } from 'react';
import { useSequentialState, delay } from 'react-seq';
import './css/App.css';

export default function App() {
  const urls = useSequentialState(async function*({ initial, mount }) {
    initial([]);
    await mount();
    const counts = [ 1, 10, 50, 100, 250, 500, 1000, 2000 ];
    let urls = [];
    for (const count of counts) {
      urls = [ ...urls, `/api/posts?per_page=${count}` ];
      yield urls;
      await delay(2000);

      urls = [ ...urls, `/api-alt/posts?per_page=${count}` ];
      yield urls;
      await delay(2000);
    }
  }, []);
  return (
    <div className="App">
      {urls.map((url, i) => {
        const type = /-alt/.test(url) ? 'Non-streaming' : 'Streaming';
        return (
          <ResponseTime key={i} url={url} title={type} />
        );
      })}
    </div>
  );
}

async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

function ResponseTime({ url, title }) {
  const items = useProgressiveJSON(url, { delay: 0 });
  const [ times, setTimes ] = useState([]);
  const [ time0, time1 ] = times;
  const timeT = times[times.length - 1];
  const duration1 = (time0 && time1) ? `${time1 - time0} ms` : '-'
  const durationT = (time0 && timeT) ? `${timeT - time0} ms` : '-'
  useEffect(() => {
    const now = new Date();
    setTimes((times) => {
      if (times.length === 0 || times.length > 0) {
        return [ ...times, now ]
      } else {
        return times;
      }
    });
  }, [ items ]);
  return (
    <div className="ResponseTime">
      <div className="title">{title}</div>
      <div className="url">{url}</div>
      <div className="duration">{duration1} / {durationT}</div>
    </div>
  );
}