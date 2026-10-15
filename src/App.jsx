import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'
import StudioModal from './StudioModal.jsx'
import CheckoutModal from './CheckoutModal.jsx'
import AccountModal from './AccountModal.jsx'
import AdminModal from './AdminModal.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Check, Heart, Menu,
  Search, ShoppingBag, SlidersHorizontal, Sparkles, X
} from 'lucide-react'

const products = [
  { id: 1, name: 'Essential Heavyweight Hoodie', category: 'Hoodies', price: 42000, tag: 'BESTSELLER', color: 'Obsidian', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85' },
  { id: 2, name: 'After Hours Runner', category: 'Sneakers', price: 68500, tag: 'NEW DROP', color: 'Silver / Black', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85' },
  { id: 3, name: 'Studio Box Tee', category: 'T-Shirts', price: 18500, tag: '', color: 'Washed Black', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85' },
  { id: 4, name: 'Utility Cargo Trouser', category: 'Trousers', price: 51000, tag: 'LIMITED', color: 'Graphite', image: 'https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=900&q=85' },
  { id: 5, name: 'Noir Puffer Jacket', category: 'Jackets', price: 96000, tag: 'EDITOR PICK', color: 'Midnight', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85' },
  { id: 6, name: 'Mono Court Sneaker', category: 'Sneakers', price: 73500, tag: '', color: 'Chalk / Ink', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85' },
  { id: 7, name: 'Everyday Layer Longsleeve', category: 'T-Shirts', price: 26000, tag: '', color: 'Stone', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85' },
  { id: 8, name: 'Night Shift Overshirt', category: 'Jackets', price: 58000, tag: 'JUST IN', color: 'Black', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85' },
]
const categories = ['All pieces', 'Hoodies', 'Sneakers', 'T-Shirts', 'Trousers', 'Jackets']
const money = (n) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n)

function App() {
  const [catalogProducts, setCatalogProducts] = useState(products)
  const [authUser, setAuthUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [category, setCategory] = useState('All pieces')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [wishlist, setWishlist] = useState([])
  const [cart, setCart] = useState([])
  const [drawer, setDrawer] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAuthUser(data.session?.user ?? null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setAuthUser(session?.user ?? null)
    })
    supabase.from('products').select('id,name,category,price_rwf,image_url,color,tag')
      .eq('is_active', true).order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (alive && !error && data?.length) {
          setCatalogProducts(data.map((p) => ({
            id: p.id, name: p.name, category: p.category, price: p.price_rwf,
            image: p.image_url, color: p.color || 'Core', tag: p.tag || ''
          })))
        }
      })
    return () => {
      alive = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadPersonalData() {
      if (!authUser) {
        setWishlist([])
        setCart([])
        return
      }
      const [wishResult, cartResult] = await Promise.all([
        supabase.from('wishlist_items').select('product_id').eq('user_id', authUser.id),
        supabase.from('cart_items').select('product_id,quantity').eq('user_id', authUser.id)
      ])
      if (!alive) return
      if (!wishResult.error) setWishlist((wishResult.data || []).map(row => row.product_id))
      if (!cartResult.error) {
        const quantities = cartResult.data || []
        setCart(quantities.flatMap(row => {
          const product = catalogProducts.find(p => String(p.id) === String(row.product_id))
          return product ? Array.from({ length: row.quantity }, () => product) : []
        }))
      }
    }
    loadPersonalData()
    return () => { alive = false }
  }, [authUser, catalogProducts])

  const submitAuth = async (event) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { display_name: authName.trim() } }
        })
        if (error) throw error
        setAuthMessage(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email to confirm it, then sign in.')
        if (data.session) setAuthOpen(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
        setAuthOpen(false)
        notify('Welcome back to DRIPVERSE')
      }
    } catch (error) {
      setAuthMessage(error.message || 'Authentication failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const visibleProducts = useMemo(() => catalogProducts.filter((p) =>
    (category === 'All pieces' || p.category === category) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  ), [catalogProducts, category, search])

  const notify = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }
  const toggleWish = async (id) => {
    const exists = wishlist.includes(id)
    setWishlist((old) => exists ? old.filter((x) => x !== id) : [...old, id])
    if (authUser && typeof id === 'string') {
      if (exists) {
        const { error } = await supabase.from('wishlist_items').delete().eq('user_id', authUser.id).eq('product_id', id)
        if (error) notify('Wishlist update failed. Please try again.')
      } else {
        const { error } = await supabase.from('wishlist_items').upsert({ user_id: authUser.id, product_id: id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true })
        if (error) notify('Wishlist could not be synced.')
      }
    } else if (!authUser) notify('Sign in to save your wishlist across devices')
    notify(exists ? 'Removed from your wishlist' : 'Saved to your wishlist')
  }
  const addToCart = async (product) => {
    setCart((old) => [...old, product])
    if (authUser && typeof product.id === 'string') {
      const { data } = await supabase.from('cart_items').select('quantity').eq('user_id', authUser.id).eq('product_id', product.id).maybeSingle()
      const nextQuantity = Math.min((data?.quantity || 0) + 1, 99)
      const { error } = await supabase.from('cart_items').upsert({ user_id: authUser.id, product_id: product.id, quantity: nextQuantity }, { onConflict: 'user_id,product_id' })
      if (error) notify('Bag could not be synced. Please try again.')
    } else if (!authUser) notify('Sign in to keep your bag saved')
    notify('Added to your bag')
  }
  const removeCartItem = async (product, index) => {
    setCart(old => old.filter((_, i) => i !== index))
    if (authUser && typeof product.id === 'string') {
      const remaining = cart.filter((p, i) => i !== index).filter(p => String(p.id) === String(product.id)).length
      if (remaining === 0) {
        await supabase.from('cart_items').delete().eq('user_id', authUser.id).eq('product_id', product.id)
      } else {
        await supabase.from('cart_items').update({ quantity: remaining }).eq('user_id', authUser.id).eq('product_id', product.id)
      }
    }
  }
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenu(false)
  }

  return (
    <div className="app-shell">
      <div className="announcement"><span>THE NEW UNIFORM HAS ARRIVED</span><span className="announcement-right">COMPLIMENTARY SHIPPING ON ORDERS OVER 150K RWF <ArrowUpRight size={12} /></span></div>
      <header className="site-header">
        <button className="icon-button mobile-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <a className="wordmark" href="#" aria-label="DRIPVERSE home">DRIP<span>VERSE</span><i>®</i></a>
        <nav className={mobileMenu ? 'main-nav is-open' : 'main-nav'}>
          <button onClick={() => scrollTo('shop')}>SHOP</button>
          <button onClick={() => scrollTo('collections')}>COLLECTIONS</button>
          <button onClick={() => scrollTo('studio')}>THE STUDIO <span className="nav-new">NEW</span></button>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}><Search size={19} /></button>
          <button className="icon-button wishlist-nav" aria-label="Open wishlist" onClick={() => setDrawer('wishlist')}><Heart size={19} /><span className="action-count">{wishlist.length}</span></button>
          <button className="icon-button" aria-label="Open shopping bag" onClick={() => setDrawer('cart')}><ShoppingBag size={19} /><span className="action-count">{cart.length}</span></button>
          {authUser?.app_metadata?.role === 'admin' && <button className="account-link admin-nav-link" onClick={() => setAdminOpen(true)}>ADMIN <ArrowUpRight size={13} /></button>}<button className="account-link" onClick={() => { if (authUser) setAccountOpen(true); else { setAuthMode('signin'); setAuthMessage(''); setAuthOpen(true) } }}>{authUser ? 'MY ACCOUNT' : 'ACCOUNT'} <ArrowUpRight size={13} /></button>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && <motion.div className="search-bar" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
          <Search size={18} /><input autoFocus value={search} onChange={(e) => { setSearch(e.target.value); scrollTo('shop') }} placeholder="Search pieces, categories, your next look..." /><button className="icon-button" onClick={() => { setSearch(''); setSearchOpen(false) }} aria-label="Close search"><X size={18} /></button>
        </motion.div>}
      </AnimatePresence>

      <main>
        <section className="hero">
          <img className="hero-image" src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=2200&q=90" alt="Editorial streetwear fashion campaign" />
          <div className="hero-shade" />
          <div className="hero-topline"><span>DRIPVERSE STUDIO / VOL. 001</span><span>KIGALI · EVERYWHERE</span></div>
          <div className="hero-content">
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 }}>NOT MADE TO BLEND IN</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }}>DEFINE YOUR<br /><span>OWN DRIP.</span></motion.h1>
            <motion.p className="hero-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}>A new perspective on everyday essentials.<br />Built for the ones who move differently.</motion.p>
            <motion.div className="hero-buttons" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .55 }}>
              <button className="button button-light" onClick={() => scrollTo('shop')}>EXPLORE THE DROP <ArrowRight size={16} /></button>
              <button className="button button-outline" onClick={() => scrollTo('studio')}>ENTER THE STUDIO <ArrowDownRight size={16} /></button>
            </motion.div>
          </div>
          <div className="hero-bottom"><span>FIG. 001 — THE EVERYDAY ICONS</span><span>DESIGNED FOR YOUR NEXT CHAPTER <ArrowDownRight size={14} /></span></div>
          <div className="hero-index">01 <span>/</span> 04</div>
        </section>

        <div className="ticker"><div className="ticker-track"><span>YOUR STYLE, YOUR RULES</span><b>✳</b><span>NO UNIFORM REQUIRED</span><b>✳</b><span>BUILT TO STAND APART</span><b>✳</b><span>YOUR STYLE, YOUR RULES</span><b>✳</b><span>NO UNIFORM REQUIRED</span><b>✳</b></div></div>

        <section className="section collection-section" id="collections">
          <div className="section-heading"><div><p className="eyebrow">CURATED FOR YOUR ROTATION</p><h2>THE <span>LINEUP.</span></h2></div><p className="section-note">Considered pieces. Endless combinations.<br />Find the pieces that feel like you.</p></div>
          <div className="category-grid">
            <button className="category-tile tile-large" onClick={() => { setCategory('Hoodies'); scrollTo('shop') }}><img src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=85" alt="Hoodies collection" /><span className="tile-number">01 / LAYERS</span><span className="tile-title">THE LAYERS <ArrowUpRight /></span></button>
            <button className="category-tile" onClick={() => { setCategory('Sneakers'); scrollTo('shop') }}><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85" alt="Sneakers collection" /><span className="tile-number">02 / FOOTWEAR</span><span className="tile-title">STEP OUT <ArrowUpRight /></span></button>
            <button className="category-tile" onClick={() => { setCategory('T-Shirts'); scrollTo('shop') }}><img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85" alt="T-shirts collection" /><span className="tile-number">03 / ESSENTIALS</span><span className="tile-title">THE EVERYDAY <ArrowUpRight /></span></button>
          </div>
        </section>

        <section className="section shop-section" id="shop">
          <div className="section-heading shop-heading"><div><p className="eyebrow">THE CURRENT ROTATION</p><h2>FRESH <span>OUT THE BOX.</span></h2></div><div className="shop-tools"><span className="product-count">{visibleProducts.length.toString().padStart(2, '0')} PIECES</span><SlidersHorizontal size={16} /></div></div>
          <div className="filter-row">{categories.map((c) => <button key={c} className={category === c ? 'filter-chip active' : 'filter-chip'} onClick={() => setCategory(c)}>{c}</button>)}</div>
          <div className="product-grid">
            {visibleProducts.map((p, i) => <motion.article className="product-card" key={p.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}>
              <div className="product-image-wrap"><img src={p.image} alt={p.name} loading="lazy" /><div className="product-topline">{p.tag && <span className="product-tag">{p.tag}</span>}<button className={wishlist.includes(p.id) ? 'wish-button selected' : 'wish-button'} aria-label={wishlist.includes(p.id) ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => toggleWish(p.id)}><Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} /></button></div><button className="quick-add" onClick={() => addToCart(p)}>ADD TO BAG <span>+</span></button></div>
              <div className="product-meta"><div><p className="product-category">{p.category} / {p.color}</p><h3>{p.name}</h3></div><strong>{money(p.price)}</strong></div>
            </motion.article>)}
          </div>
          {visibleProducts.length === 0 && <div className="empty-state">NO PIECES FOUND. TRY ANOTHER SEARCH.</div>}
          <button className="button button-outline view-all" onClick={() => { setCategory('All pieces'); setSearch('') }}>VIEW ALL PIECES <ArrowRight size={16} /></button>
        </section>

        <section className="studio-banner" id="studio">
          <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=85" alt="Fashion studio editorial" loading="lazy" />
          <div className="studio-overlay" />
          <div className="studio-copy"><p className="eyebrow"><Sparkles size={14} /> YOUR LOOK. YOUR LOGIC.</p><h2>DON'T JUST<br />WEAR IT.<br /><em>MAKE IT YOURS.</em></h2><p>Step into a new way to style. Build your rotation, experiment with combinations, and find your next signature look.</p><button className="button button-light" onClick={() => setStudioOpen(true)}>DISCOVER THE STUDIO <ArrowUpRight size={16} /></button></div>
          <span className="studio-stamp">DRIPVERSE<br />STYLE LAB / 001</span>
        </section>

        <section className="manifesto section"><p className="eyebrow">A DIFFERENT KIND OF UNIFORM</p><p className="manifesto-line">STYLE ISN'T ABOUT <span>FITTING IN.</span><br />IT'S ABOUT <span>SHOWING UP.</span></p><div className="manifesto-foot"><span>DRIPVERSE® — EST. 2026</span><span>MADE FOR YOUR WORLD <ArrowUpRight size={13} /></span></div></section>
      </main>

      <footer className="site-footer"><div className="footer-top"><a className="wordmark footer-wordmark" href="#">DRIP<span>VERSE</span><i>®</i></a><p>YOUR STYLE. YOUR UNIVERSE.</p><button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP ↑</button></div><div className="footer-bottom"><span>© 2026 DRIPVERSE. ALL RIGHTS RESERVED.</span><span>CONCEPT STORE / KIGALI, RWANDA</span><span>BUILT FOR THE BOLD.</span></div></footer>

      <AnimatePresence>
        {authOpen && <motion.div className="auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAuthOpen(false)}>
          <motion.section className="auth-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} onClick={(e) => e.stopPropagation()}>
            <button className="auth-close icon-button" onClick={() => setAuthOpen(false)} aria-label="Close account panel"><X /></button>
            <p className="eyebrow">WELCOME TO YOUR UNIVERSE</p>
            <h2>{authMode === 'signup' ? 'CREATE YOUR ACCOUNT.' : 'GOOD TO HAVE YOU BACK.'}</h2>
            <p className="auth-description">Save your pieces, keep your rotation, and build your own look.</p>
            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === 'signup' && <label>DISPLAY NAME<input value={authName} onChange={(e) => setAuthName(e.target.value)} autoComplete="name" required placeholder="Your name" /></label>}
              <label>EMAIL ADDRESS<input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
              <label>PASSWORD<input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required placeholder="At least 6 characters" /></label>
              {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
              <button className="button button-light full-button" type="submit" disabled={authBusy}>{authBusy ? 'PLEASE WAIT…' : authMode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'} <ArrowRight size={16} /></button>
            </form>
            <p className="auth-switch">{authMode === 'signup' ? 'Already have an account?' : 'New to DRIPVERSE?'} <button onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthMessage('') }}>{authMode === 'signup' ? 'SIGN IN' : 'CREATE ACCOUNT'}</button></p>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      {studioOpen && <StudioModal user={authUser} onClose={() => setStudioOpen(false)} notify={notify} />}
      {adminOpen && authUser?.app_metadata?.role === 'admin' && <AdminModal user={authUser} onClose={() => setAdminOpen(false)} notify={notify} />}
      {accountOpen && authUser && <AccountModal user={authUser} onClose={() => setAccountOpen(false)} onSignOut={async () => { await supabase.auth.signOut(); setAccountOpen(false); notify('Signed out successfully') }} notify={notify} />}
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} onOrderCreated={() => { setCart([]); setDrawer(''); notify('Order created — payment is still pending') }} />}

      <AnimatePresence>
        {drawer && <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer('')}><motion.aside className="side-drawer" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} onClick={(e) => e.stopPropagation()}><div className="drawer-heading"><div><p className="eyebrow">YOUR PERSONAL ROTATION</p><h2>{drawer === 'cart' ? 'THE BAG' : 'SAVED PIECES'}</h2></div><button className="icon-button" onClick={() => setDrawer('')} aria-label="Close drawer"><X /></button></div>{(drawer === 'cart' ? cart : catalogProducts.filter((p) => wishlist.includes(p.id))).length === 0 ? <div className="drawer-empty"><ShoppingBag size={30} /><p>{drawer === 'cart' ? 'Your bag is waiting for its first piece.' : 'Your wishlist is a blank canvas.'}</p><button className="button button-light" onClick={() => { setDrawer(''); scrollTo('shop') }}>EXPLORE THE DROP</button></div> : <><div className="drawer-items">{(drawer === 'cart' ? cart : catalogProducts.filter((p) => wishlist.includes(p.id))).map((p, i) => <div className="drawer-item" key={drawer + p.id + i}><img src={p.image} alt={p.name} /><div><p>{p.name}</p><span>{p.category}</span><strong>{money(p.price)}</strong>{drawer === 'wishlist' && <button className="text-action" onClick={() => addToCart(p)}>ADD TO BAG +</button>}</div>{drawer === 'cart' && <button className="remove-item" aria-label="Remove item" onClick={() => removeCartItem(p, i)}><X size={15} /></button>}</div>)}</div>{drawer === 'cart' && <div className="drawer-total"><div><span>SUBTOTAL</span><strong>{money(cart.reduce((sum, p) => sum + p.price, 0))}</strong></div><p>Shipping and taxes calculated at checkout.</p><button className="button button-light full-button" onClick={() => { if (!authUser) { setDrawer(''); setAuthMode('signin'); setAuthMessage('Sign in to place an order.'); setAuthOpen(true) } else { setCheckoutOpen(true) } }}>CONTINUE TO CHECKOUT <ArrowRight size={16} /></button></div>}</>}</motion.aside></motion.div>}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}><Check size={16} />{toast}</motion.div>}</AnimatePresence>
    </div>
  )
}

export default App
