import { useState } from 'react'
import { ArrowRight, CheckCircle2, X } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const money = (amount) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(amount || 0))

export default function CheckoutModal({ cart = [], subtotal = 0, shipping = 0, total = 0, onClose, onOrderCreated }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [instructions, setInstructions] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [orderId, setOrderId] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!cart.length) {
      setErrorMessage('Your bag is empty. Add a piece before checkout.')
      return
    }
    setBusy(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.rpc('create_order_from_cart', {
        p_shipping_address: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          district: district.trim(),
          address: address.trim(),
          instructions: instructions.trim(),
          country: 'Rwanda',
        },
      })
      if (error) throw error
      if (!data) throw new Error('The order was not confirmed. Please check your bag and try again.')
      setOrderId(data)
      onOrderCreated(data)
    } catch (error) {
      setErrorMessage(error.message || 'We could not create your order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="checkout-backdrop" onClick={onClose}>
    <section className="checkout-panel" onClick={event => event.stopPropagation()}>
      <button className="checkout-close icon-button" onClick={onClose} aria-label="Close checkout"><X/></button>
      {!orderId ? <>
        <p className="eyebrow">DRIPVERSE / DELIVERY DETAILS</p>
        <h2>MAKE IT <em>YOURS.</em></h2>
        <p className="checkout-intro">Confirm what is in your bag and add your delivery details. Payment has not been collected at this stage.</p>
        <div className="checkout-order-summary">
          <p className="eyebrow">ORDER SUMMARY / {cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} PIECES</p>
          {cart.map(({ product, quantity }) => <div className="checkout-summary-item" key={product.id}>
            <span>{product.name} <b>× {quantity}</b></span><strong>{money(Number(product.price) * quantity)}</strong>
          </div>)}
          <div className="checkout-summary-line"><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div>
          <div className="checkout-summary-line"><span>DELIVERY</span><strong>{shipping === 0 ? 'FREE' : money(shipping)}</strong></div>
          <div className="checkout-summary-line checkout-summary-grand"><span>ESTIMATED TOTAL</span><strong>{money(total)}</strong></div>
        </div>
        <form className="checkout-form" onSubmit={submit}>
          <label>FULL NAME<input required autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Name for delivery"/></label>
          <label>PHONE NUMBER<input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+250 7XX XXX XXX"/></label>
          <label>DISTRICT<input required value={district} onChange={e=>setDistrict(e.target.value)} placeholder="e.g. Gasabo"/></label>
          <label>DELIVERY ADDRESS<input required value={address} onChange={e=>setAddress(e.target.value)} placeholder="Sector, cell, street or landmark"/></label>
          <label>DELIVERY NOTES <span className="optional-label">OPTIONAL</span><textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={2} placeholder="Anything the delivery team should know?"/></label>
          {errorMessage&&<p className="checkout-error" role="alert">{errorMessage}</p>}
          <button className="button button-light full-button" type="submit" disabled={busy}>{busy?'CREATING ORDER…':'CREATE ORDER — RWF'} <ArrowRight size={16}/></button>
        </form>
        <p className="checkout-footnote">Free delivery from RWF 150,000. Orders remain pending until payment is connected and confirmed.</p>
      </> : <div className="checkout-success"><CheckCircle2 size={38}/><p className="eyebrow">ORDER CREATED</p><h2>YOU'RE ON THE <em>LIST.</em></h2><p>Your order has been saved securely. Payment has not been collected yet.</p><div className="order-reference"><span>ORDER REFERENCE</span><strong>{orderId.slice(0,8).toUpperCase()}</strong></div><button className="button button-light full-button" onClick={onClose}>BACK TO DRIPVERSE <ArrowRight size={16}/></button></div>}
    </section>
  </div>
}
