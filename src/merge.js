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
