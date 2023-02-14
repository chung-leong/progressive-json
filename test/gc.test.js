import { expect } from 'chai';
import { createServer } from 'http';
import { delay } from 'react-seq';

import {
  createJSONStream,
} from '../server.js';
import {
  fetchJSON,
} from '../index.js';

skip.entirely.if(!global.gc).
describe('Garbage collection', function() {
  describe('#createJSONStream', function() {
    it('should not leak memory', async function() {
      let count = 0;
      this.timeout(5 * 60 * 1000);
      async function test() {
        const server = createServer((req, res) => {
          const results = (async function*() {
            for (let i = 1; i <= 100; i++) {
              yield {
                id: i,
                date: new Date(),
                hello: 'Hello world!\n'.repeat(10),
              };
            }
          })();
          res.writeHead(200, { 'Content-type': 'application/json' });
          createJSONStream(results).pipe(res);            
        });
        await new Promise(r => server.listen(r));
        const { port } = server.address();
        const url = `http://localhost:${port}/`;
        for (let i = 0; i < 100; i++) {
          process.stdout.write(`[GC TEST] Fetching JSON #${++count}`);
          const res = await fetch(url);
          const json = await res.json();  
          process.stdout.write('\b'.repeat(40));
        }
        await new Promise(r => server.close(r));  
      }
      // establish base-line memory usage first
      await test();
      // perform garbage collection
      gc();
      const before = process.memoryUsage().heapUsed;
      // run the test multiple times
      for (let i = 0; i < 50; i++) {
        await test();
      }
      // perform garbage collection again 
      // (doing it twice in case the first pass misses something)
      gc(); gc();
      const after = process.memoryUsage().heapUsed;
      const diff = Math.round(after - before);
      expect(diff).to.not.be.above(0);
    })
  })
  describe('#fetchJSON', function() {
    it('should not leak memory', async function() {
      let count = 0;
      this.timeout(5 * 60 * 1000);
      async function test() {
        const server = createServer((req, res) => {
          const results = (async function*() {
            for (let i = 1; i <= 100; i++) {
              yield {
                id: i,
                date: new Date(),
                hello: 'Hello world!\n'.repeat(10),
              };
            }
          })();
          res.writeHead(200, { 'Content-type': 'application/json' });
          createJSONStream(results).pipe(res);            
        });
        await new Promise(r => server.listen(r));
        const { port } = server.address();
        const url = `http://localhost:${port}/`;
        for (let i = 0; i < 100; i++) {
          process.stdout.write(`[GC TEST] Fetching JSON #${++count}`);
          for await (const json of fetchJSON(url)) {            
          }
          process.stdout.write('\b'.repeat(40));
        }
        await new Promise(r => server.close(r));  
      }
      // establish base-line memory usage first
      await test();
      // perform garbage collection
      gc();
      const before = process.memoryUsage().heapUsed;
      // run the test multiple times
      for (let i = 0; i < 50; i++) {
        await test();
      }
      // perform garbage collection again 
      // (doing it twice in case the first pass misses something)
      gc(); gc();
      const after = process.memoryUsage().heapUsed;
      const diff = Math.round(after - before);
      expect(diff).to.not.be.above(0);
    })
  })
})