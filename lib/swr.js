/**
 * Shared SWR wiring.
 *
 * Every hook in `hooks/` used to own its own `useState` + `useEffect` fetch, so
 * two components calling the same hook held two independent copies of the same
 * rows and every navigation refetched from scratch. SWR replaces that with one
 * cache; the hooks keep their exact return signatures.
 */
import { mutate as globalMutate } from 'swr';

export const SWR_CONFIG = {
  // This data only changes through our own mutations, so refetching every time
  // the window regains focus is pure noise -- and on a phone, alt-tabbing back
  // to the app would re-show a loading state for data we already had.
  revalidateOnFocus: false,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  // The single line that kills refetch-on-every-navigation: a remount inside
  // this window reuses the cache instead of issuing a request.
  dedupingInterval: 30_000,
  keepPreviousData: true,
  errorRetryCount: 2,
};

/**
 * Drops every cached key. Called on sign-out -- without it, one user's
 * financial rows stay in memory and are served to the next account that signs
 * in on the same tab (the keys are scoped by usuario_id, so they would not be
 * *read*, but they would still be resident).
 *
 * `revalidate: false` matters: refetching after the session is gone would fire
 * a wave of requests that are guaranteed to 401.
 */
export function clearSwrCache() {
  return globalMutate(() => true, undefined, { revalidate: false });
}

/**
 * Key builder. Array keys are scoped by `usuarios.id` -- NOT the auth uid,
 * which is `usuarios.user_id` -- and return `null` until the profile resolves,
 * because a null key is how SWR is told "not yet".
 */
export function userKey(name, usuarioId) {
  return usuarioId ? [name, usuarioId] : null;
}
