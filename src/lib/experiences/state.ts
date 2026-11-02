/** URL state is teaching input only. Evidence and original paths never enter this channel. */
export function normalizeEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

export function readNamespacedState<T extends Record<string, string>>(
  search: string | URLSearchParams, namespace: string, defaults: T,
  allowed: { [K in keyof T]: readonly T[K][] },
): T {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const state = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const values = params.getAll(`${namespace}.${key}`);
    state[key] = normalizeEnum(values.length === 1 ? values[0] : null, allowed[key], defaults[key]);
  }
  return state;
}

export function writeNamespacedState<T extends Record<string, string>>(url: URL, namespace: string, state: T): URL {
  const result = new URL(url);
  // Remove stale/unknown namespaced inputs, preserving unrelated route state and fragment.
  for (const key of [...result.searchParams.keys()]) if (key.startsWith(`${namespace}.`)) result.searchParams.delete(key);
  for (const [key, value] of Object.entries(state)) result.searchParams.set(`${namespace}.${key}`, value);
  return result;
}
