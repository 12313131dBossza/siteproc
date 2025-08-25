// Utility helpers for merging realtime row updates into client state arrays.
// Generic upsert/remove by key predicate.
export function upsertBy<T>(list: T[], item: T, key: (r: T) => string): T[] {
  const id = key(item)
  let replaced = false
  const next = list.map(r => {
    if (key(r) === id) { replaced = true; return item }
    return r
  })
  if (!replaced) next.unshift(item)
  return next
}

export function removeBy<T>(list: T[], id: string, key: (r: T) => string): T[] {
  return list.filter(r => key(r) !== id)
}
