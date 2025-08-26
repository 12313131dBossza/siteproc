export type IdGetter<T> = (item: T) => string

export function mergeList<T>(prev: T[], incoming: T, getId: IdGetter<T>): T[] {
  const id = getId(incoming)
  const idx = prev.findIndex(p => getId(p) === id)
  if (idx === -1) return [incoming, ...prev]
  const next = prev.slice()
  next[idx] = { ...prev[idx], ...incoming }
  return next
}

export function removeFromList<T>(prev: T[], id: string, getId: IdGetter<T>): T[] {
  return prev.filter(p => getId(p) !== id)
}