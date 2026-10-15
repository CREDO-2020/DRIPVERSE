export const FREE_SHIPPING_THRESHOLD = 150000
export const STANDARD_SHIPPING_FEE = 3000

export function groupCart(cart = []) {
  const grouped = new Map()
  for (const product of cart) {
    const key = String(product.id)
    const current = grouped.get(key)
    if (current) current.quantity += 1
    else grouped.set(key, { product, quantity: 1 })
  }
  return Array.from(grouped.values())
}

export function getCartSummary(cart = []) {
  const subtotal = cart.reduce((sum, product) => sum + Number(product.price || 0), 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE
  return { subtotal, shipping, total: subtotal + shipping }
}

export function canAddProductToCart(cart = [], product) {
  const availableStock = Math.max(0, Number(product?.stock_quantity ?? 0))
  const alreadyInCart = cart.filter((item) => String(item.id) === String(product?.id)).length

  if (availableStock <= 0) {
    return { ok: false, reason: 'out_of_stock', availableStock }
  }
  if (alreadyInCart >= availableStock) {
    return { ok: false, reason: 'stock_limit', availableStock }
  }
  return { ok: true, reason: null, availableStock }
}
