const DOUBLE_QUOTE = 0x22;
const BACK_SLASH = 0x5C;
const LEFT_CURLY = 0x7B;
const LEFT_SQUARE = 0x5B;
const RIGHT_CURLY = 0x7D;
const RIGHT_SQUARE = 0x5D;
const COMMA = 0x2C;

export async function* generateJSON(source, options = {}) {
  for await (const [ str, end ] of generateJSONFragments(source, options)) {
    yield JSON.parse(str + end);
  }
}

export async function *generateJSONFragments(source, options = {}) {
  const {
    acceptable = [],    
  } = options;
  const decoder = new TextDecoder();
  let allowPartial = { root: null };
  if (acceptable !== false) {
    const root = allowPartial.root = {};
    for (const path of Array.isArray(acceptable) ? acceptable : [ acceptable ]) {
      if (path) {
        const names = path.split('.');
        let parent = root;
        for (const name of names) {
          let node = parent[name];
          if (!node) {
            node = parent[name] = {};
          }
          parent = node;
        }
      }
    }
  }
  let keyStart = 0, keyEnd = 0;
  let openBracket = 0, closeBracket = 0, stack = [];
  let inString = false, escaped = false, syntaxError = false;
  let safeIndex = 0, safeIndexBrackets = null, reportedIndex = 0;
  let index = 0, buffer;
  for await (buffer of generatePartialViews(source)) {
    if (syntaxError) {
      continue;
    }
    try {
      while (index < buffer.length) {
        const c = buffer[index];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else {
            if (c === DOUBLE_QUOTE) {
              keyEnd = index + 1;
              inString = false;
            } else if (c === BACK_SLASH) {
              escaped = true;
            }
          }
        } else {
          if (c === DOUBLE_QUOTE) {
            keyStart = index;
            inString = true;
          } else if (c === LEFT_CURLY || c === LEFT_SQUARE) {
            let key;
            if (openBracket === LEFT_CURLY) {
              const keyBuffer = buffer.subarray(keyStart, keyEnd);
              key = JSON.parse(decoder.decode(keyBuffer));
            } else if (openBracket === LEFT_SQUARE) {
              key = '#';
            } else {
              key = 'root';
            }
            // save parent object context
            stack.push({ allowPartial, openBracket, closeBracket });
            // start new context
            allowPartial = allowPartial?.[key] ?? allowPartial?.['*']; 
            openBracket = c;
            closeBracket = (c === LEFT_CURLY) ? RIGHT_CURLY : RIGHT_SQUARE;
          } else if (c === RIGHT_CURLY || c === RIGHT_SQUARE) {
            if (stack.length === 0) {
              throw new Error(`Unexpected bracket`);
            }
            // restore parent object context
            ({ allowPartial, openBracket, closeBracket } = stack.pop());
            // safe to cleave JSON after close bracket
            if (allowPartial) {
              safeIndex = index + 1;
              safeIndexBrackets = [ ...stack.map(c => c.closeBracket), closeBracket ];
            }
          } else if (c === COMMA) {
            if (stack.length === 0) {
              throw new Error(`Unexpected comma`);
            }
            // safe to cleave JSON before comma
            if (allowPartial) {
              safeIndex = index;
              safeIndexBrackets = [ ...stack.map(c => c.closeBracket), closeBracket ];
            }
          }
        }
        index++;
      } 
    } catch (err) {
      console.error(err);
      syntaxError = true;
    }
    if (safeIndex !== reportedIndex) {
      const strBuffer = buffer.subarray(0, safeIndex);
      const endBuffer = new Uint8Array(safeIndexBrackets.filter(b => !!b)).reverse();
      const str = decoder.decode(strBuffer);
      const end = decoder.decode(endBuffer);
      yield [ str, end ];
      reportedIndex = safeIndex;  
    }
  }
  if (reportedIndex < buffer.length) {
    // extra whitespaces perhaps
    yield [ decoder.decode(buffer), '' ];
  }
}

export async function* generatePartialViews(iterator) {
  let buffer = new Uint8Array(0);
  if (iterator instanceof ReadableStream) {
    iterator = generateStreamChunks(iterator);
  }
  let count = 0;
  for await (let chunk of iterator) {
    if (!(chunk instanceof Uint8Array)) {
      throw new Error('Expected data chunk to be a Uint8Array');
    }
    const newBuffer = new Uint8Array(buffer.length + chunk.length);
    newBuffer.set(buffer);
    newBuffer.set(chunk, buffer.length);
    buffer = newBuffer;
    yield buffer;
    count++;    
  }
  if (count === 0) {
    yield buffer;
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
