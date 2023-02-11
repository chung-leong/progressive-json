import { useEffect, useMemo, useRef } from 'react';
import { useSequentialState } from 'react-seq';
import { fetchJSON } from './fetch.js';

export function useProgressiveJSON(url, options) {
  // pass options to generator function using a ref so it isn't rerun
  // when the options change for whatever reason
  const ref = useRef({});
  ref.current.options = options;
  const object = useSequentialState(async function*({ defer, signal }) {
    const {
      delay = 100,
      ...fetchOptions
    } = ref.current.options;
    defer(delay);
    fetchOptions.signal = signal;
    yield fetchJSON(url, fetchOptions);
  }, [ url ]);
  return object;
}

export function usePartialJSON(url, options = {}) {
  const ref = useRef({});
  ref.current.options = options;
  const object = useSequentialState(async function*({ defer, manageEvents, signal }) {
    const [ on, eventual ] = manageEvents();
    const {
      delay = 100,
      chunkSize = 50 * 1024,
      ...fetchOptions
    } = ref.current.options;
    defer(delay);
    fetchOptions.chunkSize = chunkSize;
    fetchOptions.signal = signal;
    // promise returned by pause() is fulfilled by more()
    fetchOptions.pause = () => eventual.request;
    ref.current.more = on.request;
    yield fetchJSON(url, fetchOptions);
  }, [ url ]);
  return [ object, ref.current.more ];
}

export function useArraySlice(array, start, length, more) {
  const slice = useMemo(() => array?.slice(start, length), [ array, start, length ]);
  useEffect(() => {
    if (array?.length < start + length) {
      more?.();
    }
  }, [ array, start, length, more ]);
  return slice;
}