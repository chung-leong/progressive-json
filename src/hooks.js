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
    yield fetchJSON(url, fetchOptions);
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
    yield fetchJSON(url, fetchOptions);
  }, [ url ]);
  return [ object, ref.current.more ];
}

export function useArraySlice(array, start, end, more) {
  let extra = 0;
  if (Array.isArray(end)) {
    extra = end[1]
    end = end[0];
  }
  const slice = useMemo(() => array?.slice(start, end), [ array, start, end ]);
  useEffect(() => {
    if (array?.length < end + extra) {
      more?.();
    }
  }, [ array, start, end, extra, more ]);
  return slice;
}