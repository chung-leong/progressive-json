import { useEffect, useState } from 'react';
import { generateJSON } from './json.js';
import * as example from './example.js';
import './css/App.css';
import { merge } from './object-merge.js';

export default function App() {
  const [ input, setInput ] = useState(() => JSON.stringify(example.object, undefined, 2));
  const [ output, setOutput ] = useState();
  const [ url, setURL ] = useState('');
  const [ sourceURL, setSourceURL ] = useState('');
  const [ acceptableList, setAcceptableList ] = useState(example.acceptable);
  const [ chunkSize, setChunkSize ] = useState(`15`);

  useEffect(() => {
    if (sourceURL) {
      const controller = new AbortController();
      const { signal } = controller;
      (async () => {
        const res = await fetch(sourceURL);
        if (res.status !== 200) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        return JSON.stringify(json, undefined, 2);
      })().then(setInput).catch(err => console.error(err));
      return () => controller.abort();
    }
  }, [ sourceURL ]);
  useEffect(() => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const chunks = [];
    const size = Math.max(1, parseInt(chunkSize) || Infinity);
    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.subarray(i, i + size));
    }
    const acceptable = acceptableList.split(/\r?\n/).filter(s => !!s);
    const source = (async function*() {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
    (async () => {
      const spans = [];
      try {
        const options = { acceptable, yieldClosingBrackets: true };
        let text;
        const segments = [];
        for await (const [ object, end ] of generateJSON(source, options)) {
          text = JSON.stringify(object, undefined, 2);
          let endOffset = text.length;
          // subtract end brackets (plus indent)
          for (let i = 0; i < end.length; i++) {
            endOffset -= 2 + i * 2;
          }
          segments.push({ endOffset, end });
        }
        let key = 0;
        let startOffset = 0;
        for (const { endOffset, end } of segments) {
          const title = `fragment ${key} + ${end.replace(/(.)/g, '$1  ')}`;
          const style = (key & 1) ? { color: '#fff', backgroundColor: '#000' } : undefined;
          const segmentText = text.substring(startOffset, endOffset);
          const span = <span {...{key, style, title}}>{segmentText}</span>;
          spans.push(span);
          startOffset = endOffset;
          key++;
        }
      } catch (e) {
        console.error(e)
      }
      setOutput(spans);
    })();
  }, [ input, chunkSize, acceptableList ]);

  return (
    <div className="App">
      <div id="row1" className="row">
        <div id="inputCell" className="cell">
          <label>Input:</label>
          <textarea id="input" value={input} onChange={e => setInput(e.target.value)} autoCorrect="off" spellCheck={false} />
        </div>
        <div id="outputCell" className="cell">
          <label>Output:</label>
          <div id="output">{output}</div>
        </div>
      </div>
      <div id="row2" className="row">
        <div id="inputOptionsCell" className="cell">
          <label>JSON URL:</label>
          <div className="row">
            <input id="url" value={url} onChange={e => setURL(e.target.value)} />
            <button disabled={!url.trim()} onClick={e => setSourceURL(url)}>Fetch</button>
          </div>
          <label>Acceptable:</label>
          <textarea id="acceptable" value={acceptableList} onChange={e => setAcceptableList(e.target.value)} autoCorrect="off" spellCheck={false} />
        </div>
        <div id="outputOptionsCell" className="cell">
          <label>Chunk size:</label>
          <div className="row">
            <input id="chunkSize" value={chunkSize} onChange={e => setChunkSize(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
