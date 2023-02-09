export async function* generateJSON(source, options) {
  for await (const [ str, end ] of generateJSONFragments(source, options)) {
    yield JSON.parse(str + end);
  }
}

export async function *generateJSONFragments(source, options = {}) {
  const {
    acceptable = [],    
  } = options;
  const decoder = new TextDecoder();
  let allowRoot = null;
  if (acceptable !== false) {
    allowRoot = {};
    for (const path of Array.isArray(acceptable) ? acceptable : [ acceptable ]) {
      if (path) {
        const names = path.split('.');
        let parent = allowRoot;
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
  let allowCurrent = null, allowStack = [], closeStack = [];
  let index = 0, safeIndex = 0, reportedIndex = 0; 
  let keyStart = 0, keyEnd = 0;
  let inString = false, inObject = false, escaped = false, syntaxError = false;
  let buffer;
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
          } else if (c === LEFT_CURLY || c === LEFT_BRACKET) {
            if (inObject) {
              allowStack.push(allowCurrent);
              const nameBuffer = buffer.subarray(keyStart, keyEnd);
              const string = decoder.decode(nameBuffer);
              const name = JSON.parse(string);
              allowCurrent = allowCurrent[name]; 
            } else if (allowStack.length === 0) {
              allowCurrent = allowRoot;
            }
            inObject = (c === LEFT_CURLY);
            closeStack.push(inObject ? RIGHT_CURLY : RIGHT_BRACKET);
          } else if (c === RIGHT_CURLY || c === RIGHT_BRACKET) {
            if (closeStack.length > 0) {
              closeStack.pop();
            } else {
              syntaxError = true;
              continue;
            }
            inObject = (closeStack[closeStack.length - 1] === RIGHT_CURLY);
            if (inObject) {
              allowCurrent = allowStack.pop();
              if (allowCurrent) {
                safeIndex = index + 1;
              }
            }
          } else if (c === COMMA) {
            if (allowCurrent) {
              safeIndex = index;
            }
          }
          if (safeIndex !== reportedIndex) {
            const strBuffer = buffer.subarray(0, safeIndex);
            const str = decoder.decode(strBuffer);
            const end = decoder.decode(new Uint8Array(closeStack).reverse());
            yield [ str, end ];
            reportedIndex = safeIndex;  
          }
        }
        index++;
      } 
    } catch (err) {
      syntaxError = true;
    }
  }
  yield [ decoder.decode(buffer), '' ];
}

const DOUBLE_QUOTE = 0x22;
const BACK_SLASH = 0x5C;
const LEFT_CURLY = 0x7B;
const LEFT_BRACKET = 0x5B;
const RIGHT_CURLY = 0x7D;
const RIGHT_BRACKET = 0x5D;
const COMMA = 0x2C;

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
