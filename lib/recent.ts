export function addToRecent(product: any) {
  let stored = []

  try {
    stored = JSON.parse(localStorage.getItem('recent') || '[]')
  } catch {}

  const updated = [
    product,
    ...stored.filter((p: any) => p.id !== product.id),
  ].slice(0, 8)

  localStorage.setItem('recent', JSON.stringify(updated))

  return updated
}

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem('recent') || '[]')
  } catch {
    return []
  }
}