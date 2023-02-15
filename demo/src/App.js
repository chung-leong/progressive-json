import { useEffect, useState } from 'react';
import { generateJSON } from 'progressive-json';
import * as example from './example.js';
import './css/App.css';

export default function App() {
  const [ input, setInput ] = useState(() => JSON.stringify(example.object, undefined, 2));
  const [ output, setOutput ] = useState();
  const [ url, setURL ] = useState('');
  const [ sourceURL, setSourceURL ] = useState('');
  const [ sourceError, setSourceError ] = useState();
  const [ partialList, setPartialList ] = useState(example.partial);
  const [ chunkSize, setChunkSize ] = useState(`16`);
  
  useEffect(() => {
    if (sourceURL) {
      const controller = new AbortController();
      const { signal } = controller;      
      (async () => {
        try {
          const res = await fetch(sourceURL, { signal });
          if (res.status !== 200) {
            throw new Error(`HTTP ${res.status} - ${res.stateText}`);
          }
          const data = await res.json();
          const text = JSON.stringify(data, undefined, 2);
          setInput(text);
          setSourceError(null);
          if (text.length >= 102400) {
            setChunkSize(s => Math.max(s, 1024));
          }
        } catch (err) {
          setSourceError(err);
        } finally {
          setSourceURL('');
        }
      })();
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
    const partial = partialList.split(/\r?\n/).filter(s => !!s);
    const source = (async function*() {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
    (async () => {
      const spans = [];
      try {
        const options = { partial, yieldClosingBrackets: true };
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
          const style = (key & 1) ? { backgroundColor: '#ddd' } : undefined;
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
  }, [ input, chunkSize, partialList ]);

  return (
    <div className="App">
      <div id="row1" className="row">
        <div id="inputCell" className="cell">
          <label>Input:</label>
          <textarea id="input" value={input} onChange={e => setInput(e.target.value)} onScroll={e => matchScroll(e.target, 'output')} spellCheck={false} />
        </div>
        <div id="outputCell" className="cell">
          <label>Output:</label>
          <div id="output" onScroll={e => matchScroll(e.target, 'input')}>{output}</div>
        </div>
      </div>
      <div id="row2" className="row">
        <div id="inputOptionsCell" className="cell">
          <label>JSON URL:</label>
          <div className="row">
            <input id="url" className={sourceError && 'error'} title={sourceError?.message} value={url} onChange={e => setURL(e.target.value)} spellCheck={false} />
            <button disabled={!url.trim()} onClick={e => setSourceURL(url)}>Fetch</button>
          </div>
          <label>Partial:</label>
          <textarea id="partial" value={partialList} onChange={e => setPartialList(e.target.value)} spellCheck={false} />
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

function matchScroll(el, targetId) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollTop = el.scrollTop;
  }
}