import { useEffect, useState } from 'react';
import { generateJSONFragments } from './json.js';
import * as example from './example.js';
import './css/App.css';

export default function App() {
  const [ input, setInput ] = useState(() => JSON.stringify(example.object, undefined, 2));
  const [ output, setOutput ] = useState();
  const [ url, setURL ] = useState('');
  const [ acceptableList, setAcceptableList ] = useState(example.acceptable);
  const [ chunking, setChunking ] = useState('size');
  const [ chunkSize, setChunkSize ] = useState(`10`);
  const [ chunkList, setChunkList ] = useState(``);

  useEffect(() => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const chunks = [];
    if (chunking === 'size') {
      const size = Math.max(1, parseInt(chunkSize) || Infinity);
      for (let i = 0; i < data.length; i += size) {
        chunks.push(data.subarray(i, i + size));
      }
    } else {
      const list = chunkSize.split(',').map(s => parseInt(s)).filter(n => !!n);
      for (let i = 0, j = 0, size = list[j]; j < list.length; i += size, j++, size = list[j]) {
        chunks.push(data.subarray(i, i + size));
      }
    }
    const acceptable = acceptableList.split(/\r?\n/).filter(s => !!s);
    const source = (async function*() {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();
  (async () => {
      const segments = [];
      try {
        let offset = 0, key = 1;
        let even = false;
        for await (const [ str ] of generateJSONFragments(source, { acceptable })) {
          const title = `fragment ${key}`;
          const style = even ? { color: '#fff', backgroundColor: '#000' } : undefined;
          const span = <span {...{key, style, title}}>{str.substr(offset)}</span>;
          segments.push(span);
          offset = str.length;
          even = !even;
          key++;
        }
      } catch (e) {
    
      }
      return segments;
    })().then(setOutput);
  }, [ input, chunking, chunkSize, chunkList, acceptableList ]);

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
            <button disabled={!url.trim()}>Fetch</button>
          </div>
          <label>Acceptable:</label>
          <textarea id="acceptable" value={acceptableList} onChange={e => setAcceptableList(e.target.value)} autoCorrect="off" spellCheck={false} />
        </div>
        <div id="outputOptionsCell" className="cell">
          <label>
            <input type="radio" radioGroup="chunking" checked={chunking === 'size'} onChange={e => setChunking('size')} />
            {' '}
            Chunk size:
          </label>
          <div className="row">
            <input id="chunkSize" value={chunkSize} onChange={e => setChunkSize(e.target.value)} />
          </div>
          <label>
            <input type="radio" radioGroup="chunking" checked={chunking === 'list'} onChange={e => setChunking('list')} />
            {' '}
            Chunks:
          </label>
          <div className="row">
            <input id="chunkList" value={chunkList} onChange={e => setChunkList(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
