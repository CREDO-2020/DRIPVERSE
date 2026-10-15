import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Package, Shirt, UserRound, X, MapPin, Pencil, Truck, Trash2 } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const money = (amount) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(amount || 0)
const statusLabels = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  processing: 'Being prepared',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}
const statusClass = (status) => ['paid', 'delivered'].includes(status) ? 'account-status is-good' : ['cancelled', 'refunded'].includes(status) ? 'account-status is-muted' : 'account-status'
const trackingSteps = [
  { key: 'pending', label: 'Placed' },
  { key: 'paid', label: 'Paid' },
  { key: 'processing', label: 'Preparing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]
const trackingRank = (status) => trackingSteps.findIndex((step) => step.key === status)

export default function AccountModal({ user, onClose, onEditLook, onSignOut, notify }) {
  const [tab, setTab] = useState('orders')
  const [profile, setProfile] = useState({ display_name: user.user_metadata?.display_name || '', country: 'RW' })
  const [orders, setOrders] = useState([])
  const [looks, setLooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [deletingLookId, setDeletingLookId] = useState('')

  useEffect(() => {
    let active = true
    async function loadAccount() {
      setLoading(true)
      setLoadError('')
      const [profileResult, orderResult, looksResult] = await Promise.all([
        supabase.from('profiles').select('display_name,country').eq('id', user.id).maybeSingle(),
        supabase.from('orders').select('id,status,currency,subtotal_rwf,shipping_rwf,total_rwf,shipping_address,created_at,order_items(product_name,unit_price_rwf,quantity)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('outfits').select('id,name,avatar_config,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (profileResult.data) setProfile({
        display_name: profileResult.data.display_name || user.user_metadata?.display_name || '',
        country: profileResult.data.country || 'RW',
      })
      if (orderResult.error || looksResult.error) {
        setLoadError('Some account information could not be loaded. Please refresh and try again.')
      }
      setOrders(orderResult.data || [])
      setLooks(looksResult.data || [])
      setLoading(false)
    }
    loadAccount()
    return () => { active = false }
  }, [user])

  async function deleteLook(look) {
    if (!window.confirm(`Delete the saved look "${look.name}"? This cannot be undone.`)) return
    setDeletingLookId(look.id)
    const { error } = await supabase.from('outfits').delete().eq('id', look.id).eq('user_id', user.id)
    setDeletingLookId('')
    if (error) {
      notify('Could not delete this saved look. Please try again.')
      return
    }
    setLooks(old => old.filter(item => item.id !== look.id))
    notify('Saved look deleted')
  }

  async function saveProfile(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: profile.display_name.trim(),
      country: profile.country.trim().toUpperCase() || 'RW',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) setMessage('Profile could not be saved. Please try again.')
    else {
      setMessage('Profile saved successfully.')
      notify('Your account details were updated')
    }
  }

  return <div className="account-backdrop" onClick={onClose}>
    <section className="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-title" onClick={(event) => event.stopPropagation()}>
      <button className="account-close icon-button" onClick={onClose} aria-label="Close account"><X /></button>
      <div className="account-heading">
        <p className="eyebrow">YOUR DRIPVERSE PROFILE</p>
        <h2 id="account-title">YOUR <em>UNIVERSE.</em></h2>
        <p>{user.email}</p>
      </div>
      <div className="account-tabs" role="tablist" aria-label="Account sections">
        <button className={tab === 'orders' ? 'is-active' : ''} onClick={() => setTab('orders')}><Package size={15}/> ORDERS</button>
        <button className={tab === 'looks' ? 'is-active' : ''} onClick={() => setTab('looks')}><Shirt size={15}/> SAVED LOOKS</button>
        <button className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}><UserRound size={15}/> PROFILE</button>
      </div>
      <div className="account-content">
        {loadError && <p className="account-message is-error" role="status">{loadError}</p>}
        {loading ? <div className="account-loading"><span className="account-spinner"/> LOADING YOUR UNIVERSE…</div> : <>
          {tab === 'orders' && <section className="account-section">
            <div className="account-section-title"><div><p className="eyebrow">ORDER HISTORY</p><h3>YOUR ORDERS <span>({orders.length})</span></h3></div><Package size={22}/></div>
            {orders.length === 0 ? <div className="account-empty"><Package size={28}/><h4>No orders yet.</h4><p>Your first DRIPVERSE order will show up here after checkout.</p><button className="button button-light" onClick={onClose}>EXPLORE THE DROP <ArrowRight size={15}/></button></div> : <div className="account-order-list">
              {orders.map((order) => <article className="account-order" key={order.id}>
                <div className="account-order-top"><div><span className="account-order-label">ORDER / {order.id.slice(0, 8).toUpperCase()}</span><p>{new Date(order.created_at).toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' })}</p></div><span className={statusClass(order.status)}>{statusLabels[order.status] || order.status}</span></div>
                <div className="account-order-items">{(order.order_items || []).map((item, index) => <div key={order.id + '-' + index}><span>{item.product_name} <b>× {item.quantity}</b></span><strong>{money(item.unit_price_rwf * item.quantity)}</strong></div>)}</div>
                <div className="account-order-total"><span>{order.shipping_rwf ? 'Includes delivery' : 'Delivery included'}</span><strong>{money(order.total_rwf)}</strong></div>
                {order.shipping_address && <div className="account-shipping-detail"><MapPin size={14}/><span><b>{order.shipping_address.district || 'Delivery address'}</b>{order.shipping_address.address && <small>{order.shipping_address.address}</small>}</span></div>}
                {!['cancelled', 'refunded'].includes(order.status) && <div className="account-tracking" aria-label="Order progress">
                  <div className="account-tracking-heading"><Truck size={14}/><span>DELIVERY JOURNEY</span><small>{statusLabels[order.status] || order.status}</small></div>
                  <div className="account-tracking-steps">{trackingSteps.map((step, stepIndex) => <div key={step.key} className={'account-tracking-step' + (trackingRank(order.status) >= stepIndex ? ' is-complete' : '') + (order.status === step.key ? ' is-current' : '')}><i>{trackingRank(order.status) >= stepIndex ? '✓' : stepIndex + 1}</i><span>{step.label}</span></div>)}</div>
                </div>}
                {order.status === 'pending' && <p className="account-payment-note"><Clock3 size={13}/> Payment has not been confirmed for this order yet. DRIPVERSE has not collected payment through this checkout yet.</p>}
              </article>)}
            </div>}
          </section>}
          {tab === 'looks' && <section className="account-section">
            <div className="account-section-title"><div><p className="eyebrow">STYLE LAB</p><h3>SAVED LOOKS <span>({looks.length})</span></h3></div><Shirt size={22}/></div>
            {looks.length === 0 ? <div className="account-empty"><Shirt size={28}/><h4>Your style archive is empty.</h4><p>Build a look in the 3D Studio and save it to see it here.</p><button className="button button-light" onClick={onClose}>GO TO THE STUDIO <ArrowRight size={15}/></button></div> : <div className="account-look-grid">{looks.map((look) => <article className="account-look-card" key={look.id}><div className="account-look-colors"><i style={{ background: look.avatar_config?.top || '#191919' }}/><i style={{ background: look.avatar_config?.pants || '#383838' }}/><i style={{ background: look.avatar_config?.shoes || '#e6e1d8' }}/></div><h4>{look.name}</h4><p>Saved {new Date(look.created_at).toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' })}</p><span><CheckCircle2 size={13}/> SAVED TO YOUR ACCOUNT</span><button className="account-edit-look" onClick={() => onEditLook?.(look)}><Pencil size={13}/> CUSTOMIZE THIS LOOK <ArrowRight size={13}/></button><button className="account-delete-look" onClick={() => deleteLook(look)} disabled={deletingLookId === look.id}>{deletingLookId === look.id ? 'DELETING…' : <><Trash2 size={13}/> DELETE SAVED LOOK</>}</button></article>)}</div>}
          </section>}
          {tab === 'profile' && <section className="account-section">
            <div className="account-section-title"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h3>YOUR DETAILS</h3></div><UserRound size={22}/></div>
            <form className="account-profile-form" onSubmit={saveProfile}>
              <label>DISPLAY NAME<input value={profile.display_name} maxLength={80} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} required placeholder="Your name"/></label>
              <label>EMAIL ADDRESS<input value={user.email || ''} readOnly disabled/></label>
              <label>COUNTRY CODE<input value={profile.country} maxLength={2} onChange={(event) => setProfile({ ...profile, country: event.target.value.toUpperCase() })} required placeholder="RW"/></label>
              {message && <p className={message.startsWith('Profile could') ? 'account-message is-error' : 'account-message'} role="status">{message}</p>}
              <button className="button button-light full-button" type="submit" disabled={saving}>{saving ? 'SAVING…' : 'SAVE PROFILE'} <ArrowRight size={15}/></button>
            </form>
          </section>}
        </>}
      </div>
      <div className="account-footer"><span>DRIPVERSE® · KIGALI, RWANDA</span><button onClick={onSignOut}>SIGN OUT <ArrowRight size={14}/></button></div>
    </section>
  </div>
}
