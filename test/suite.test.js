import { expect } from 'chai';
import { readdirSync, readFileSync } from 'fs';
import { basename } from 'path';
import randomSeed from 'random-seed';

import {
  generateJSON,
} from '../index.js';
import { 
  createJSONStream 
} from '../server.js';

describe('Parsing files from test suite', function() {
  // JSON files from https://github.com/nst/JSONTestSuite
  describe('#test_parsing', () => addFolder('parse', resolve('./test_parsing')))
  describe('#test_transform', () => addFolder('parse', resolve('./test_transform')))
})
describe('Stringifying objects from test suite', function() {
  describe('#test_parsing', () => addFolder('stringify', resolve('./test_parsing')))
  describe('#test_transform', () => addFolder('stringify', resolve('./test_transform')))
})

function addFolder(test, path) {
  const files = readdirSync(path);
  for (const file of files) {
    if (/\.json$/.test(file)) {
      addFile(test, `${path}/${file}`);
    }
  }
}

function addFile(test, path) {
  const filename = basename(path);
  const data = new Uint8Array(readFileSync(path));
  try {
    const decoder = new TextDecoder();
    const text = decoder.decode(data);
    const object = JSON.parse(text);
    const rand = randomSeed(filename);
    if (test === 'parse') {
      it(`should correctly parse ${filename}`, async function() {
        for (let i = 0; i < 32; i++) {
          const chunkSize = rand.intBetween(1, data.length);
          const chunks = [];
          for (let offset = 0; offset < data.length; offset += chunkSize) {
            chunks.push(data.subarray(offset, offset + chunkSize));
          }
          const source = (async function*() { 
            for (const chunk of chunks) {
              yield chunk;
            }
          })();
          // get the final result
          let result;
          for await (const object of generateJSON(source, { partial: '*.*.*' }) ) {
            result = object;
          }
          expect(result).to.eql(object);
        }
      })  
    } else if (test === 'stringify') {
      it(`should generate identical result for ${filename}`, async function() {
        const text1 = JSON.stringify(object, undefined, 2);
        const text2 = await readText(createJSONStream(object, undefined, 2));
        expect(text2).to.equal(text1);
      })
    }
  } catch (err) {
    // the file presumably is supposed to be invalid
    if (test === 'parse') {
      const error1 = err;
      it(`should fail to parse ${filename}`, async function() {
        const source = (async function*() {
          yield data;
        })();
        let error2;
        try {
          for await (const object of generateJSON(source, { partial: '*.*.*' }) ) {
          }
        } catch (err) {
          error2 = err;
        }
        expect(error2).to.be.an('error');
        expect(error2.message).to.equal(error1.message);
      })  
    }
  }
}

async function readText(generator) {
  const chunks = [];
  let size = 0;
  for await (const chunk of generator) {
    chunks.push(chunk);
    size += chunk.length;
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}
