export function merge(base, fragment, depth) {
  const isArray = Array.isArray(base);
  if (depth > 1) {
    if (isArray) {
      const indexB = base.length - 1;
      base = [ ...base ];
      // merge the last in the base with the first in the fragment
      base[indexB] = merge(base[indexB], fragment[0], depth - 1);
      // append remaining
      base.push(...fragment.slice(1));
    } else {
      base = { ...base };
      const keysB = Object.keys(base);
      const keysF = Object.keys(fragment);
      // merge last property in the base with the first property in the fragment
      const keyB = keysB.pop();
      const keyF = keysF.shift();
      base[keyB] = merge(base[keyB], fragment[keyF], depth - 1);
      // copy remaining
      for (const key of keysF) {
        base[key] = fragment[key];
      }      
    }
    return base;
  } else {
    if (isArray) {
      return [ ...base, ...fragment ];
    } else {
      return { ...base, ...fragment };
    }
  }
}

export function empty(base, depth)  {
  const isArray = Array.isArray(base);
  if (depth > 1) {
    let key;
    if (isArray) {
      key = base.length - 1;
    } else {
      const keys = Object.keys(base);
      key = keys[keys.length - 1];
    }
    return empty(base[key], depth - 1);
  } else {
    if (isArray) {
      return (base.length === 0);
    } else {
      const keys = Object.keys(base);
      return (keys.length === 0);
    }
  }
}