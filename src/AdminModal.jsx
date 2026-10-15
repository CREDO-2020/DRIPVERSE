import { useCallback, useEffect, useState } from 'react'
import { Archive, ArrowDownRight, ArrowUpRight, Box, Check, ClipboardList, LoaderCircle, Package, Plus, RefreshCw, Save, Search, ShieldCheck, X } from 'lucide-react'
import { supabase } from './lib/supabase.js'

const money = (value) => new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(value) || 0)
const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const emptyProduct = { name: '', slug: '', description: '', category: 'T-Shirts', price_rwf: '', image_url: '', color: 'Core', tag: '', stock_quantity: 0, is_active: true }
const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminModal({ user, onClose, notify }) {
  const [tab, setTab] = useState('overview')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [productForm, setProductForm] = useState(emptyProduct)
  const [savingProduct, setSavingProduct] = useState(false)
  const [savingOrderId, setSavingOrderId] = useState(null)

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setMessage('')
    const [productResult, orderResult] = await Promise.all([
      supabase.from('products').select('id,name,slug,description,category,price_rwf,image_url,color,tag,is_active,stock_quantity,created_at').order('created_at', { ascending: false }),
      supabase.from('orders').select('id,user_id,status,currency,subtotal_rwf,shipping_rwf,total_rwf,shipping_address,created_at,order_items(product_name,unit_price_rwf,quantity)').order('created_at', { ascending: false }).limit(100),
    ])
    if (productResult.error || orderResult.error) {
      setMessage('Some admin data could not load. Check that your account has the admin role and refresh your session.')
    }
    setProducts(productResult.data || [])
    setOrders(orderResult.data || [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadData(); }, [loadData])

  function openNewProduct() {
    setEditingId(null)
    setProductForm(emptyProduct)
    setProductFormOpen(true)
    setMessage('')
  }

  function openEditProduct(product) {
    setEditingId(product.id)
    setProductForm({
      name: product.name || '', slug: product.slug || '', description: product.description || '',
      category: product.category || 'T-Shirts', price_rwf: String(product.price_rwf ?? ''),
      image_url: product.image_url || '', color: product.color || 'Core', tag: product.tag || '',
      stock_quantity: product.stock_quantity ?? 0, is_active: product.is_active ?? true,
    })
    setProductFormOpen(true)
    setMessage('')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSavingProduct(true)
    setMessage('')
    const price = Number(productForm.price_rwf)
    const stock = Number(productForm.stock_quantity)
    if (!productForm.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setMessage('Enter a product name, a valid non-negative price, and a whole-number stock quantity.')
      setSavingProduct(false)
      return
    }
    const payload = {
      name: productForm.name.trim(),
      slug: slugify(productForm.slug || productForm.name),
      description: productForm.description.trim() || null,
      category: productForm.category.trim(),
      price_rwf: Math.round(price),
      image_url: productForm.image_url.trim() || null,
      color: productForm.color.trim() || 'Core',
      tag: productForm.tag.trim() || null,
      stock_quantity: stock,
      is_active: Boolean(productForm.is_active),
      updated_at: new Date().toISOString(),
    }
    const result = editingId
      ? await supabase.from('products').update(payload).eq('id', editingId).select('id').maybeSingle()
      : await supabase.from('products').insert(payload).select('id').maybeSingle()
    setSavingProduct(false)
    if (result.error || !result.data) {
      setMessage(result.error?.code === '23505' ? 'That product URL slug already exists. Choose another slug.' : result.error?.message || 'Product could not be saved. Verify your admin role and try again.')
      return
    }
    setProductFormOpen(false)
    notify(editingId ? 'Product updated' : 'Product created')
    await loadData(true)
  }

  async function updateOrderStatus(order, status) {
    if (status === order.status) return
    setSavingOrderId(order.id)
    setMessage('')
    const { data, error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order.id).select('id,status').maybeSingle()
    setSavingOrderId(null)
    if (error || !data) {
      setMessage('Order status was not updated. Check the admin role and refresh your session.')
      return
    }
    setOrders((old) => old.map((item) => item.id === order.id ? { ...item, status: data.status } : item))
    notify('Order status updated')
  }

  const visibleProducts = products.filter((product) => [product.name, product.category, product.slug].some((value) => (value || '').toLowerCase().includes(search.toLowerCase())))
  const visibleOrders = orders.filter((order) => {
    const query = orderSearch.trim().toLowerCase()
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter
    const searchable = [order.id, order.shipping_address?.full_name, order.shipping_address?.phone, order.shipping_address?.district, order.shipping_address?.address]
    const matchesQuery = !query || searchable.some((value) => String(value || '').toLowerCase().includes(query))
    return matchesStatus && matchesQuery
  })
  const pendingOrders = orders.filter((order) => order.status === 'pending').length
  const lowStock = products.filter((product) => product.is_active && Number(product.stock_quantity) <= 5).length
  const revenue = orders.filter((order) => ['paid', 'processing', 'shipped', 'delivered'].includes(order.status)).reduce((sum, order) => sum + Number(order.total_rwf || 0), 0)

  return <div className="admin-backdrop" onClick={onClose}>
    <section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.stopPropagation()}>
      <header className="admin-header"><div><p className="eyebrow"><ShieldCheck size={13}/> DRIPVERSE CONTROL ROOM</p><h2 id="admin-title">ADMIN <em>STUDIO.</em></h2><p>{user.email} · Product and order management</p></div><button className="icon-button" onClick={onClose} aria-label="Close admin dashboard"><X/></button></header>
      <nav className="admin-tabs" aria-label="Admin sections">
        <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}><ArrowDownRight size={15}/> OVERVIEW</button>
        <button className={tab === 'products' ? 'is-active' : ''} onClick={() => setTab('products')}><Box size={15}/> PRODUCTS</button>
        <button className={tab === 'orders' ? 'is-active' : ''} onClick={() => setTab('orders')}><ClipboardList size={15}/> ORDERS</button>
        <button className="admin-refresh" onClick={() => loadData(true)} disabled={refreshing} aria-label="Refresh admin data"><RefreshCw size={15} className={refreshing ? 'admin-spinning' : ''}/></button>
      </nav>
      <div className="admin-content">
        {message && <p className="admin-message" role="status">{message}</p>}
        {loading ? <div className="admin-loading"><LoaderCircle className="admin-spinning"/> LOADING CONTROL ROOM…</div> : <>
          {tab === 'overview' && <section>
            <div className="admin-welcome"><div><p className="eyebrow">SYSTEM OVERVIEW</p><h3>Keep the universe in motion.</h3><p>Manage the catalog, monitor incoming orders, and keep stock accurate.</p></div><ShieldCheck size={35}/></div>
            <div className="admin-stat-grid">
              <article><span>ACTIVE PRODUCTS</span><strong>{products.filter((p) => p.is_active).length}</strong><small><Box size={13}/> {products.length} catalog entries</small></article>
              <article><span>PENDING ORDERS</span><strong>{pendingOrders}</strong><small><ClipboardList size={13}/> Needs attention</small></article>
              <article><span>LOW STOCK</span><strong>{lowStock}</strong><small><Package size={13}/> Active items at 5 or less</small></article>
              <article><span>CONFIRMED ORDER VALUE</span><strong>{money(revenue)}</strong><small><ArrowUpRight size={13}/> Paid and fulfilment stages</small></article>
            </div>
            <div className="admin-overview-bottom"><div><p className="eyebrow">LATEST ORDERS</p><h3>Recent activity</h3>{orders.slice(0,4).length ? orders.slice(0,4).map((order) => <div className="admin-mini-order" key={order.id}><span><b>#{order.id.slice(0,8).toUpperCase()}</b><small>{new Date(order.created_at).toLocaleDateString('en-RW')}</small></span><span>{order.status}</span><strong>{money(order.total_rwf)}</strong></div>) : <p className="admin-muted">No orders yet.</p>}</div><div><p className="eyebrow">QUICK ACTIONS</p><button className="admin-quick-action" onClick={openNewProduct}><Plus size={16}/> Add a new product <ArrowUpRight size={14}/></button><button className="admin-quick-action" onClick={() => setTab('products')}><Box size={16}/> Update inventory <ArrowUpRight size={14}/></button><button className="admin-quick-action" onClick={() => setTab('orders')}><ClipboardList size={16}/> Review customer orders <ArrowUpRight size={14}/></button></div></div>
          </section>}
          {tab === 'products' && <section className="admin-table-section"><div className="admin-section-head"><div><p className="eyebrow">CATALOG CONTROL</p><h3>Products <span>({products.length})</span></h3></div><button className="button button-light" onClick={openNewProduct}><Plus size={15}/> ADD PRODUCT</button></div><div className="admin-tools"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product name, category, slug…"/></div><div className="admin-product-list">{visibleProducts.map((product) => <article className="admin-product-row" key={product.id}><img src={product.image_url || 'https://placehold.co/120x150/171717/eeeeee?text=DRIPVERSE'} alt="" loading="lazy"/><div className="admin-product-info"><h4>{product.name}</h4><p>{product.category} · {product.color || 'Core'}{product.tag ? ' · ' + product.tag : ''}</p><strong>{money(product.price_rwf)}</strong><span className={product.is_active ? 'admin-product-active' : 'admin-product-inactive'}>{product.is_active ? 'ACTIVE IN STORE' : 'ARCHIVED'} · STOCK {product.stock_quantity}</span></div><button className="admin-edit-button" onClick={() => openEditProduct(product)}>EDIT <ArrowUpRight size={13}/></button></article>)}{visibleProducts.length === 0 && <p className="admin-muted">No matching products.</p>}</div></section>}
          {tab === 'orders' && <section className="admin-table-section"><div className="admin-section-head"><div><p className="eyebrow">FULFILMENT DESK</p><h3>Customer orders <span>({visibleOrders.length} of {orders.length})</span></h3></div></div>{orders.length === 0 ? <p className="admin-muted">No orders have been placed yet.</p> : <><div className="admin-order-filters"><label className="admin-tools"><Search size={16}/><input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order ID, customer, phone or district…"/></label><label className="admin-order-filter-label">STATUS<select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}><option value="all">ALL STATUSES</option>{statuses.map((status) => <option key={status} value={status}>{status.toUpperCase()}</option>)}</select></label></div>{visibleOrders.length === 0 ? <p className="admin-muted">No orders match these filters.</p> : <div className="admin-order-list">{visibleOrders.map((order) => <article className="admin-order-card" key={order.id}><div className="admin-order-heading"><div><span>ORDER / {order.id.slice(0,8).toUpperCase()}</span><p>{new Date(order.created_at).toLocaleString('en-RW')}</p></div><strong>{money(order.total_rwf)}</strong></div><div className="admin-order-items">{(order.order_items || []).map((item, index) => <p key={order.id + '-' + index}>{item.product_name} <span>× {item.quantity}</span> <b>{money(item.unit_price_rwf * item.quantity)}</b></p>)}</div><div className="admin-shipping-summary"><b>{order.shipping_address?.full_name || 'Customer'}</b><span>{order.shipping_address?.phone || 'No phone'}</span><span>{[order.shipping_address?.district, order.shipping_address?.address].filter(Boolean).join(' · ')}</span></div><label className="admin-status-label">ORDER STATUS<select value={order.status} disabled={savingOrderId === order.id || order.status === 'cancelled'} onChange={(event) => updateOrderStatus(order, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status.toUpperCase()}</option>)}</select>{savingOrderId === order.id && <LoaderCircle size={14} className="admin-spinning"/>}{order.status === 'cancelled' && <small className="admin-muted">Cancelled orders cannot be reopened. Create a new order instead.</small>}</label></article>)}</div>}</>}</section>}
        </>}
      </div>
      {productFormOpen && <div className="admin-form-backdrop" onClick={() => setProductFormOpen(false)}><form className="admin-product-form" onSubmit={saveProduct} onClick={(event) => event.stopPropagation()}><div className="admin-form-heading"><div><p className="eyebrow">{editingId ? 'EDIT CATALOG ENTRY' : 'NEW CATALOG ENTRY'}</p><h3>{editingId ? 'Update product.' : 'Add a piece.'}</h3></div><button type="button" className="icon-button" onClick={() => setProductFormOpen(false)} aria-label="Close product form"><X/></button></div><div className="admin-form-grid">
        <label>PRODUCT NAME<input required maxLength={140} value={productForm.name} onChange={(e) => setProductForm({...productForm,name:e.target.value,slug:editingId ? productForm.slug : slugify(e.target.value)})} placeholder="Essential Heavyweight Hoodie"/></label>
        <label>URL SLUG<input required maxLength={160} value={productForm.slug} onChange={(e) => setProductForm({...productForm,slug:e.target.value})} placeholder="essential-heavyweight-hoodie"/></label>
        <label>CATEGORY<input required maxLength={60} value={productForm.category} onChange={(e) => setProductForm({...productForm,category:e.target.value})} placeholder="Hoodies"/></label>
        <label>PRICE (RWF)<input required type="number" min="0" step="1" value={productForm.price_rwf} onChange={(e) => setProductForm({...productForm,price_rwf:e.target.value})} placeholder="42000"/></label>
        <label>STOCK QUANTITY<input required type="number" min="0" step="1" value={productForm.stock_quantity} onChange={(e) => setProductForm({...productForm,stock_quantity:e.target.value})}/></label>
        <label>COLOR<input maxLength={60} value={productForm.color} onChange={(e) => setProductForm({...productForm,color:e.target.value})} placeholder="Obsidian"/></label>
        <label>PRODUCT TAG<input maxLength={50} value={productForm.tag} onChange={(e) => setProductForm({...productForm,tag:e.target.value})} placeholder="BESTSELLER"/></label>
        <label>IMAGE URL<input type="url" value={productForm.image_url} onChange={(e) => setProductForm({...productForm,image_url:e.target.value})} placeholder="https://…"/></label>
        <label className="admin-full-field">DESCRIPTION<textarea rows="3" maxLength={1500} value={productForm.description} onChange={(e) => setProductForm({...productForm,description:e.target.value})} placeholder="Describe the piece…"/></label>
        <label className="admin-active-check"><input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({...productForm,is_active:e.target.checked})}/> Available in storefront</label>
      </div>{message && <p className="admin-message">{message}</p>}<div className="admin-form-actions"><button type="button" className="button button-outline" onClick={() => setProductFormOpen(false)}>CANCEL</button><button className="button button-light" type="submit" disabled={savingProduct}>{savingProduct ? 'SAVING…' : <><Save size={15}/> SAVE PRODUCT</>}</button></div></form></div>}
      <footer className="admin-footer"><span>DRIPVERSE ADMIN · AUTHORIZED ACCESS ONLY</span><span><ShieldCheck size={13}/> ROLE VERIFIED BY SUPABASE APP METADATA</span></footer>
    </section>
  </div>
}
