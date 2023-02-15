import { generateJSON } from './parse.js';

export async function* fetchJSON(url, options = {}) {
  const {
    partial,
    pause,
    ...fetchOptions
  } = options;
  let yielded = false;
  if (pause) {
    // pause only after something has been yielded by generateJSON()
    fetchOptions.pause = () => {
      if (yielded) {
        yielded = false;
        return pause();
      }
    };
  }
  let restarts = 0;
  for (;;) {
    try {
      const source = fetchChunks(url, fetchOptions);
      for await (const object of generateJSON(source, { partial })) {
        yield object;
        yielded = true;
      }
      break;
    } catch (err) {
      if (++restarts < 10) {
        if (err instanceof HTTPError && err.status === 412) {
          // file changed while we're retrieving it--start over
          continue;
        }  
      }        
      throw err;
    }
  }
}

export async function* fetchChunks(url, options = {}) {
  const {
    chunkSize = 0,
    maxRetries = Infinity,
    retryInterval = 1000 * 30,
    pause,
    ...fetchOptions
  } = options;
  let offset = 0, etag = '', size = -1, failures = 0;
  for (;;) {
    try {
      if (failures > 0) {
        await new Promise(r => setTimeout(r, retryInterval));        
      }
      if (chunkSize > 0) {
        const headers = fetchOptions.headers = { ...fetchOptions.headers };
        if (etag) {
          headers['if-match'] = etag;
        }
        headers['range'] = `bytes=${offset}-${offset + chunkSize - 1}`;
        const res = await fetch(url, fetchOptions);
        if (res.status !== 206) {
          throw new HTTPError(res);
        }
        etag = res.headers.get('etag');
        if (!etag) {
          throw new Error(`Resource does not have an etag ${url}`);
        }
        const range = res.headers.get('content-range');
        const m = /bytes\s+(\d+)-(\d+)\/(\d+)/i.exec(range);
        if (!m) {
          throw new Error(`Invald content range header: ${range}`);
        }
        offset = parseInt(m[2]) + 1;
        size = parseInt(m[3]);
        for await (const chunk of generateStreamChunks(res.body)) {
          yield chunk;
        }
        if (offset >= size) {
          break;
        } else {
          // if the caller passed a pause function, then we wait still for 
          // the promise to be fulfilled
          await pause?.();
        }   
      } else {
        const res = await fetch(url, fetchOptions);
        if (res.status !== 200) {
          throw new HTTPError(res);
        }
        for await (const chunk of generateStreamChunks(res.body)) {
          yield chunk;
        }
        break;
      }
    } catch (err) {
      if (++failures < maxRetries) {
        if (err instanceof HTTPError && [ 408, 429, 502, 504 ].includes(err.status)) {
          continue;
        }  
      }
      throw err;
    }
  }
}

export async function* generateStreamChunks(stream) {
  const reader = stream.getReader();
  for (;;) {
    let { value, done } = await reader.read();
    if (done) {
      break;
    }
    yield value;
  }
}

class HTTPError extends Error { 
  constructor(res) {
    super(`HTTP ${res.status} - ${res.statusText}`);
    this.status = res.status;
    this.statusText = res.statusText;
  }
}

