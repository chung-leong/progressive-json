import { expect } from 'chai';
import { readdirSync, readFileSync } from 'fs';
import { basename } from 'path';
import randomSeed from 'random-seed';

import {
  generateJSON,
} from '../index.js';

describe('Parsing files from test suite', function() {
  // JSON files from https://github.com/nst/JSONTestSuite
  addFolder(resolve('./test_parsing'));
  addFolder(resolve('./test_transform'));
})

function addFolder(path) {
  const files = readdirSync(path);
  for (const file of files) {
    if (/\.json$/.test(file)) {
      addFile(`${path}/${file}`);
    }
  }
}

function addFile(path) {
  try {
    const data = new Uint8Array(readFileSync(path));
    const filename = basename(path);
    const decoder = new TextDecoder();
    const text = decoder.decode(data);
    const object = JSON.parse(text);
    const rand = randomSeed(filename);
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
  } catch (err) {

  }
}

