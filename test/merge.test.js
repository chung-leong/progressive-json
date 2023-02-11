import { expect } from 'chai';

import {
  merge
} from '../src/merge.js';

describe('Fragment merging', function() {
  describe('#merge', function() {
    it ('should attach fragment onto array', function() {
      const base = [ 1, 2, 3, 4 ];
      const fragment = [ 5, 6, 7 ];
      const result = merge(base, fragment, 1);
      expect(result).to.eql([ 1, 2, 3, 4, 5, 6, 7 ]);
      expect(base).to.eql([ 1, 2, 3, 4 ]);
      expect(fragment).to.eql([ 5, 6, 7 ]);
    })
    it ('should merge object at end and attach additional element', function() {
      const base = [
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
        }
      ];
      const fragment = [
        {
          b: [ 4, 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ];
      const result = merge(base, fragment, 2);
      expect(result).to.eql([
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
          b: [ 4, 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ]);
      expect(base).to.eql([
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
        }
      ]);
      expect(fragment).to.eql([
        {
          b: [ 4, 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ]);
      expect(result[0]).to.equal(base[0]);
      expect(result[1]).to.not.equal(base[1]);
      expect(result[2]).to.not.equal(fragment[0]);
      expect(result[2]).to.equal(fragment[1])
    })
    it('should merge array property of object', function() {
      const base = [
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
          b: [ 4 ],
        }
      ];
      const fragment = [
        {
          b: [ 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ];
      const result = merge(base, fragment, 3);
      expect(result).to.eql([
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
          b: [ 4, 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ]);
      expect(base).to.eql([
        { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        {
          a: "World",        
          b: [ 4 ],
        }
      ]);
      expect(fragment).to.eql([
        {
          b: [ 5, 6 ],
          c: true,
        },
        {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      ]);
    })
    it('should merge array property of object in object', function() {
      const base = {
        cat: { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        dog: {
          a: "World",        
          b: [ 4 ],
        }
      };
      const fragment = {
        "": {
          b: [ 5, 6 ],
          c: true,
        },
        cow: {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      };
      const result = merge(base, fragment, 3);
      expect(result).to.eql({
        cat: { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        dog: {
          a: "World",        
          b: [ 4, 5, 6 ],
          c: true,
        },
        cow: {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      });
      expect(base).to.eql({
        cat: { 
          a: "Hello",
          b: [ 1, 2, 3 ],
          c: false,
        },
        dog: {
          a: "World",        
          b: [ 4 ],
        }
      });
      expect(fragment).to.eql({
        "": {
          b: [ 5, 6 ],
          c: true,
        },
        cow: {
          a: "Home",
          b: [ 7 ],
          c: false,
        }
      });
    })  
  })
})
