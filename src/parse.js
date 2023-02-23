import { empty, merge } from './merge.js';

const DOUBLE_QUOTE = 0x22;
const BACK_SLASH = 0x5C;
const LEFT_CURLY = 0x7B;
const LEFT_SQUARE = 0x5B;
const RIGHT_CURLY = 0x7D;
const RIGHT_SQUARE = 0x5D;
const COMMA = 0x2C;

export async function *generateJSON(source, options = {}) {
  const {
    partial = [],
  } = options;
  const decoder = new TextDecoder();
  let allowPartial = { root: null };
  if (partial !== false) {
    const root = allowPartial.root = {};
    for (const path of Array.isArray(partial) ? partial : [ partial ]) {
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
  let openingSequence = [], prevResult, hasSibling = false;
  let leftover = new Uint8Array(0), charIndex = 0;
  let loaded = 0, total = 0;  
  for await (let buffer of source) {
    let index = 0;
    loaded += buffer.length;
    total = buffer.total;
    if (leftover) {
      const combined = new Uint8Array(leftover.length + buffer.length);
      combined.set(leftover);
      combined.set(buffer, leftover.length);
      index = leftover.length;      
      buffer = combined;
    }
    let closingSequence = null;
    let safeEndIndex = 0;
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
        let safeOffset = -1;
        if (c === DOUBLE_QUOTE) {
          keyStart = index;
          inString = true;
        } else if (c === LEFT_CURLY || c === LEFT_SQUARE) {
          let key;
          if (openBracket === LEFT_CURLY) {
            const keyBuffer = buffer.subarray(keyStart, keyEnd);
            try {
              key = JSON.parse(decoder.decode(keyBuffer));
            } catch (err) {
              syntaxError = true;
              break;
            }
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
            syntaxError = true;
            break;
          }
          // restore parent object context
          ({ allowPartial, openBracket, closeBracket } = stack.pop());
          // safe to cleave JSON after close bracket
          if (allowPartial) {
            safeOffset = 1;
          }
        } else if (c === COMMA) {
          if (stack.length === 0) {
            syntaxError = true;
            break;
          }
          // safe to cleave JSON before comma
          if (allowPartial) {
            safeOffset = 0;
          }
        }
        if (safeOffset !== -1) {
          safeEndIndex = index + safeOffset;
          // construct closing sequence
          closingSequence = [];
          for (const c of [ ...stack.map(c => c.closeBracket), closeBracket ]) {
            if (c) {
              const cb = (c === RIGHT_CURLY) ? '}' : ']';
              closingSequence.unshift(cb);
            }
          }
        }
      }
      index++;
    } 
    let processed = false;
    if (safeEndIndex > 0 && !syntaxError) {
      const strBuffer = buffer.subarray(0, safeEndIndex);
      const str = decoder.decode(strBuffer);
      charIndex += str.length;
      // remove any leading comma if there's a preceding sibling
      const fragment = (hasSibling) ? str.replace(/^\s*,\s*/, '') : str;
      const start = openingSequence.join('');
      const end = closingSequence.join('');
      try {
        let result = JSON.parse(start + fragment + end);
        if (prevResult) {
          // merge result into previous result
          result = merge(prevResult, result, openingSequence.length);
        }
        // check if the end object isn't empty, which would be only happen when 
        // the JSON is syntactically incorrect (e.g. "{, 5")
        setJSONProgress(result, { loaded, total, brackets: end, done: end === '' });
        yield result;
        hasSibling = !empty(result, closingSequence.length);
        prevResult = result;
        // construct opening sequence for the next chunk
        openingSequence = [];
        for (const cb of closingSequence) {
          let ob = (cb === '}') ? '{' : '[';
          if (ob === '{' && openingSequence.length > 0) {
            // assign first property to dummy key
            ob += '"":';
          }
          openingSequence.unshift(ob);
        }
        leftover = buffer.subarray(safeEndIndex);
        // adjust key indices if a key happens to be in the leftover
        keyStart -= safeEndIndex;
        keyEnd -= safeEndIndex;
        processed = true;  
      } catch (err) {
        syntaxError = true;
      }
    } 
    if (!processed) {
      leftover = buffer;
      if (syntaxError) {
        break;
      }
    }
  }
  // text remaining at the end
  const str = decoder.decode(leftover);
  if (prevResult === undefined) {
    // no object was found--probably a scalar
    yield JSON.parse(str);
  } else if (str.trim() || openingSequence.length > 0) {
    // not just whitespaces remaining or closing brackets are missing
    // an error was encountered
    const fragment = (hasSibling) ? str.replace(/^\s*,\s*/, '') : str;
    // if there's no opening sequence, a proper object was parsed but garbage follows
    const start = (openingSequence.length > 0) ? openingSequence.join('') : '{}';
    // pad the text with spaces at the beginning to make position line up with original
    const space = ' '.repeat(charIndex - start.length);
    JSON.parse(space + start + fragment);  
  }
}

let progressCache;

function setJSONProgress(json, progress) {
  if (!progressCache) {
    progressCache = new WeakMap();
  }
  progressCache.set(json, progress);
}

export function getJSONProgress(json) {
  if (json && typeof(json) === 'object') {
    const progress = progressCache?.get(json);
    if (progress) {
      return progress;
    }
  }
  return {};
}
