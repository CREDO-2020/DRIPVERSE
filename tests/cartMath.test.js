import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAddProductToCart,
  FREE_SHIPPING_THRESHOLD,
  getCartSummary,
  groupCart,
  STANDARD_SHIPPING_FEE,
} from '../src/lib/cartMath.js'

test('empty cart has zero subtotal, delivery, and total', () => {
  assert.deepEqual(getCartSummary([]), { subtotal: 0, shipping: 0, total: 0 })
})

test('cart summary adds standard delivery below the free-delivery threshold', () => {
  assert.deepEqual(getCartSummary([{ price: 42000 }, { price: 18500 }]), {
    subtotal: 60500,
    shipping: STANDARD_SHIPPING_FEE,
    total: 63500,
  })
})

test('cart summary makes delivery free at and above the threshold', () => {
  assert.deepEqual(getCartSummary([{ price: FREE_SHIPPING_THRESHOLD }]), {
    subtotal: FREE_SHIPPING_THRESHOLD,
    shipping: 0,
    total: FREE_SHIPPING_THRESHOLD,
  })
  assert.equal(getCartSummary([{ price: 160000 }]).shipping, 0)
})

test('groupCart combines repeated product IDs while preserving product data', () => {
  const hoodie = { id: 'hoodie-1', name: 'Hoodie', price: 42000 }
  const shoes = { id: 'shoes-1', name: 'Shoes', price: 68500 }
  assert.deepEqual(groupCart([hoodie, shoes, hoodie]), [
    { product: hoodie, quantity: 2 },
    { product: shoes, quantity: 1 },
  ])
})

test('stock check allows additions only while requested quantity stays below stock', () => {
  const hoodie = { id: 'hoodie-1', stock_quantity: 2 }
  assert.equal(canAddProductToCart([], hoodie).ok, true)
  assert.equal(canAddProductToCart([hoodie], hoodie).ok, true)
  assert.deepEqual(canAddProductToCart([hoodie, hoodie], hoodie), {
    ok: false,
    reason: 'stock_limit',
    availableStock: 2,
  })
})

test('stock check rejects products with zero or missing stock', () => {
  assert.equal(canAddProductToCart([], { id: 'x', stock_quantity: 0 }).reason, 'out_of_stock')
  assert.equal(canAddProductToCart([], { id: 'x' }).reason, 'out_of_stock')
})
