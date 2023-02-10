import { generateJSON } from './json.js';

export async function* fetchProgressiveJSON(url, options) {
  const {
    partial,
    ...fetchOptions
  } = options;
  let finished = false, attempts = 0;
  while (!finished && attempts < 10) {
    try {
      const source = fetchChunks(url, fetchOptions);
      for await (const object of generateJSON(source, { partial })) {
        yield object;
      }
      finished = true;
    } catch (err) {
      if (err instanceof HTTPError && err.status === 406) {
        // file changed while we're retrieving it--start over
        continue;
      }
      throw err;
    }
    attempts++;
  }
}

export async function* fetchChunks(url, options) {
  const {
    chunkSize = 50 * 1024,
    maxAttempts = Infinity,
    retryInterval = 1000 * 30,
    pause,
    ...fetchOptions
  } = options;
  let finished = false, offset = 0, etag = '', size = -1, attempts = 0;
  while (!finished && attempts < maxAttempts) {
    try {
      if (!(chunkSize > 0)) {
        throw new Error(`Invalid chunk size: ${chunkSize}`);
      }
      const headers = fetchOptions.headers = { ...fetchOptions.headers };
      if (etag) {
        headers['if-match'] = etag;
      }
      headers['range'] = `bytes=${offset}-${offset + chunkSize - 1}`;
      const res = await fetch(url, fetchOptions);
      if (res.status !== 206) {
        throw await createHTTPError(res);
      }
      etag = res.headers.get('etag');
      if (!etag) {
        throw new Error(`Resource does not have an etag ${url}`);
      }
      const range = res.headers.get('content-range');
      const m = /bytes\s+(\d+)\-(\d+)\/(\d+)/i.exec(range);
      if (!m) {
        throw new Error(`Invald range header: ${range}`);
      }
      offset = parseInt(m[2]) + 1;
      size = parseInt(m[3]);
      for await (const chunk of generateStreamChunks(res.body)) {
        yield chunk;
      }
      if (offset === size) {
        finished = true;
      } else {
        // if the caller passed a pause function, then we wait still for 
        // the promise to be fulfilled
        await pause?.();
      }   
    } catch (err) {
      // TODO: see if error is temporary
      throw err;
    }
    attempts++;
  }
}

export async function* generateStreamChunks(stream) {
  const reader = stream.getReader();
  let finished = false;
  while (!finished) {
    let { value, done } = await reader.read();
    if (value) {
      yield value;
    }
    finished = done;
  }
}

export async function createHTTPError(res) {
  const error = new HTTPError(`HTTP ${res.status} - ${res.statusText}`);
  error.status = res.status;
  error.statusText = res.statusText;
  try {
    const json = await res.json();
    for await (const [ key, value ] of json) {
      error[key] = value;
    }
  } catch (err) {
  }
  return error;
}

class HTTPError extends Error {};