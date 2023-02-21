import { useEffect, useMemo, useRef } from 'react';
import { useSequentialState } from 'react-seq';
import { fetchJSON } from './fetch.js';

export function useProgressiveJSON(url, options) {
  // pass options to generator function using a ref so it isn't rerun
  // when the options change for whatever reason
  const ref = useRef({});
  ref.current.options = options;
  const object = useSequentialState(async function*({ initial, defer, mount, signal }) {
    const {
      delay = 100,
      ...fetchOptions
    } = ref.current.options;
    initial([]);
    defer(delay);
    fetchOptions.signal = signal;
    await mount();
    if (url) {
      yield fetchJSON(url, fetchOptions); 
    }
  }, [ url ]);
  return object;
}

export function usePartialJSON(url, options = {}) {
  const ref = useRef({});
  ref.current.options = options;
  const object = useSequentialState(async function*({ initial, defer, mount, manageEvents, signal }) {
    const [ on, eventual ] = manageEvents();
    const {
      delay = 100,
      chunkSize = 50 * 1024,
      ...fetchOptions
    } = ref.current.options;
    initial([]);
    defer(delay);
    fetchOptions.chunkSize = chunkSize;
    fetchOptions.signal = signal;
    // promise returned by pause() is fulfilled by more()
    fetchOptions.pause = () => eventual.request;
    ref.current.more = on.request;
    await mount();
    if (url) {
      yield fetchJSON(url, fetchOptions);
    }
  }, [ url ]);
  return [ object, ref.current.more ];
}

export function useArraySlice(array, start, end, options = {}) {
  let extra, more, map, filter;
  if (typeof(options) === 'function') {
    more = options;
    extra = 0;
  } else {
    ({ more, map, filter, extra = 0 } = options);
  }
  const ref = useRef();
  ref.current = { more, map, filter };
  const slice = useMemo(() => {
    if (ref.current.filter) {
      array = array?.filter(ref.current.filter);
    }
    if (ref.current.map) {
      array = array?.map(ref.current.map);
    }
    return array?.slice(start, end);
  }, [ array, start, end ]);
  useEffect(() => {
    if (slice?.length < end + extra) {
      ref.current.more?.();
    }
  }, [ slice, end, extra ]);
  return slice;
}