import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from './api.js';

export interface QueryState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
}

/**
 * A deliberately small data hook: fetch on mount, refetch on demand, ignore responses that
 * arrive after the component has moved on. Everything in phase 1 is a handful of reads per
 * screen, so a cache layer would be more machinery than the product needs.
 */
export function useQuery<T>(path: string | null, deps: unknown[] = []): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    const ticket = ++latest.current;
    setLoading(true);
    api
      .get<T>(path)
      .then((result) => {
        if (ticket !== latest.current) return;
        setData(result);
        setError(null);
      })
      .catch((caught: ApiError) => {
        if (ticket !== latest.current) return;
        setError(caught);
      })
      .finally(() => {
        if (ticket === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { data, error, loading, reload };
}

export interface MutationState<TInput, TResult> {
  run: (input: TInput) => Promise<TResult | null>;
  pending: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useMutation<TInput, TResult>(
  handler: (input: TInput) => Promise<TResult>,
): MutationState<TInput, TResult> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(
    async (input: TInput) => {
      setPending(true);
      setError(null);
      try {
        return await handler(input);
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught : new ApiError(0, 'unknown', 'Something went wrong.'),
        );
        return null;
      } finally {
        setPending(false);
      }
    },
    [handler],
  );

  return { run, pending, error, reset: () => setError(null) };
}
