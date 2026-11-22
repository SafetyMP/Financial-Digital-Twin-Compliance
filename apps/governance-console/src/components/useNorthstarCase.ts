'use client';
import { useEffect, useState } from 'react';
import { defaults, queryFor, readSelection, type Selection } from '../lib/northstar-case';

export function useNorthstarCase() {
  const [selection, setSelection] = useState(defaults);
  useEffect(() => {
    const read = () => setSelection(readSelection(window.location.search));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function update(change: Partial<Selection>) {
    const next = {...selection, ...change};
    setSelection(next);
    window.history.replaceState(window.history.state, '', window.location.pathname + queryFor(next) + window.location.hash);
  }
  return {selection, update};
}
