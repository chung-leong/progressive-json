import { expect } from 'chai';
import { createElement } from 'react';
import { create, act } from 'react-test-renderer';
import { createServer } from 'http';

import {
  useProgressiveJSON,
  usePartialJSON,
  useArraySlice,
} from '../index.js';

describe('React hooks', function() {
  const server = createServer((req, res) => server.handler?.(req, res));
  before(function(done) {
    server.listen(0, done);
  })
  after(function(done) {
    server.close(done);
  })
  afterEach(function() {
    server.handler = null;
  })
  describe('#useProgressiveJSON', function() {
    it('should retrieve a JSON file progressively', async function() {
      const record = (id) => { return { id } };
      const object = {
        results: [ 1, 2, 3, 4, 5 ].map(record)
      };
      const data = JSON.stringify(object);
      let requests = 0;
      server.handler = (req, res) => {
        requests++;
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d+)-(\d+)/.exec(range);
          const si = parseInt(m[1]), ei = parseInt(m[2]);
          res.writeHead(206, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
            'Content-Range': `bytes ${si}-${ei}/${data.length}`,
          });
          res.end(data.substring(si, ei + 1));       
        } else {
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
          });
          res.end(data);
        }
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      const objects = [];
      function Test() {
        const object = useProgressiveJSON(url, { chunkSize: 5, delay: 0, partial: 'results' });
        objects.push(object);
        return `${object.results}`;
      }
      const el = createElement(Test);
      const renderer = new create(el);
      // wait for the expected requests to happen
      while (requests < Math.ceil(data.length / 5)) {
        await delay(10);
      }
      await delay(30);
      expect(objects).to.have.lengthOf(6);
      expect(objects[0]).to.eql([]);
      expect(objects[1].results).to.have.lengthOf(1);
      expect(objects[2].results).to.have.lengthOf(2);
    })
  })
  describe('#usePartialJSON', function() {
    it('should retrieve more of the JSON when the more function is called', async function() {
      const record = (id) => { return { id } };
      const object = {
        results: [ 1, 2, 3, 4, 5 ].map(record)
      };
      const data = JSON.stringify(object);
      let requests = 0;
      server.handler = (req, res) => {
        requests++;
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d+)-(\d+)/.exec(range);
          const si = parseInt(m[1]), ei = parseInt(m[2]);
          res.writeHead(206, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
            'Content-Range': `bytes ${si}-${ei}/${data.length}`,
          });
          res.end(data.substring(si, ei + 1));       
        } else {
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
          });
          res.end(data);
        }
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      const objects = [];
      let m;
      function Test() {
        const [ object, more ] = usePartialJSON(url, { chunkSize: 15, delay: 0, partial: 'results' });
        m = more;
        if (object) {
          objects.push(object);
          return `${object.results}`;
        } else {
          return null;
        }
      }
      const el = createElement(Test);
      const renderer = new create(el);
      // wait for the expected request to happen
      while (requests < 1) {
        await delay(10);
      }
      const len1 = objects.length;
      m();
      while (requests < 2) {
        await delay(10);
      }
      await delay(30);
      const len2 = objects.length;
      expect(len2).to.be.above(len1);
      // run it through to the end to ensure the line after the yield statement 
      // is covered
      while (requests < Math.ceil(data.length / 15)) {
        m();
        await delay(10);
      }
    })
  })
  describe('#useArraySlice', function() {
    it('should return undefined when array is undefined', async function() {
      function Test() {
        const slice = useArraySlice(undefined, 0, 10);
        return `${slice}`;
      }
      const el = createElement(Test);
      const renderer = new create(el);
      expect(renderer.toJSON()).to.equal('undefined');
    })
    it('should invoke callback when array is too short', async function() {
      function Test({ array, more }) {
        const slice = useArraySlice(array, 0, 4, more);
        return `${slice}`;
      }
      let called = false;
      const el = createElement(Test, { array: [ 'alfa', 'bravo', 'charlie' ] , more: () => called = true });
      let renderer; 
      await act(() => renderer = new create(el));
      expect(renderer.toJSON()).to.equal('alfa,bravo,charlie');
      expect(called).to.be.true;
    })
    it('should not invoke callback when array is long enough', async function() {
      function Test({ array, more }) {
        const slice = useArraySlice(array, 0, 4, more);
        return `${slice}`;
      }
      let called = false;
      const el = createElement(Test, { array: [ 'alfa', 'bravo', 'charlie', 'delta', 'echo' ] , more: () => called = true });
      let renderer; 
      await act(() => renderer = new create(el));
      expect(renderer.toJSON()).to.equal('alfa,bravo,charlie,delta');
      expect(called).to.be.false;
    })
    it('should ensure that usePartialJSON would return the desired number of items', async function() {
      const record = (id) => { return { id } };
      const object = {
        results: [ 1, 2, 3, 4, 5 ].map(record)
      };
      const data = JSON.stringify(object);
      let requests = 0;
      server.handler = (req, res) => {
        requests++;
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d+)-(\d+)/.exec(range);
          const si = parseInt(m[1]), ei = parseInt(m[2]);
          res.writeHead(206, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
            'Content-Range': `bytes ${si}-${ei}/${data.length}`,
          });
          res.end(data.substring(si, ei + 1));       
        } else {
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Etag': 'abc',
          });
          res.end(data);
        }
      };
      const { port } = server.address();
      const url = `http://localhost:${port}/resource`;
      function Test() {
        const [ object, more ] = usePartialJSON(url, { chunkSize: 5, delay: 0, partial: 'results' });
        const array = useArraySlice(object?.results, 0, 5, more);
        return `${object.results?.map(obj => obj.id)}`;
      }
      const el = createElement(Test);
      const renderer = new create(el);
      // wait for the expected request to happen
      while (requests < Math.ceil(data.length / 5)) {
        await delay(10);
      }
      await delay(30);
      expect(renderer.toJSON()).to.equal('1,2,3,4,5');
    })
  })
})

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}