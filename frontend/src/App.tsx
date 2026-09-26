import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowUpRight, Bell, Boxes,
  ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, Command,
  Download, Ellipsis, FileClock, Filter, LayoutDashboard, LogOut, Menu, Package, Pencil,
  Plus, Search, Settings, SlidersHorizontal, TrendingUp,
  Truck, Warehouse, X, Check, TriangleAlert,
} from 'lucide-react'

type Product = { id: number; name: string; sku: string; category: string; onHand: number; reserved: number; uom: string; location: string; min: number; color: string }
type Operation = { id: string; backendId?: number; type: string; partner: string; date: string; status: string; warehouse: string; items: number; productId?: number; quantity?: number }
type Movement = { id: number | string; reference: string; type: string; product: string; sku: string; warehouse: string; location: string; quantityDelta: number; balanceAfter: number; occurredAt: string }
type WarehouseItem = { id: number; name: string; code: string; address: string; active: boolean }
type Section = 'Dashboard' | 'Products' | 'Receipts' | 'Delivery orders' | 'Internal transfers' | 'Adjustments' | 'Move history' | 'Warehouses' | 'Settings'
type AuthMode = 'login' | 'signup' | 'reset' | 'verify'
type LocalAccount = { fullName: string; email: string; passwordSalt: string; passwordHash: string }

async function hashPassword(password: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const digest = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120_000 }, material, 256)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api`

async function apiRequest<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('stocksense-token')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(String(body.error ?? body.message ?? 'Request failed'))
  return body as T
}

function toMovement(value: Record<string, unknown>): Movement {
  return { id: Number(value.id), reference: String(value.reference), type: String(value.type).toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`), product: String(value.product), sku: String(value.sku), warehouse: String(value.warehouse), location: String(value.location), quantityDelta: Number(value.quantityDelta), balanceAfter: Number(value.balanceAfter), occurredAt: new Date(String(value.occurredAt)).toLocaleString() }
}

const startingProducts: Product[] = [
  { id: 1, name: 'Steel rod · 12 mm', sku: 'STL-012-CR', category: 'Raw materials', onHand: 1240, reserved: 180, uom: 'kg', location: 'Main / A-01', min: 300, color: 'mint' },
  { id: 2, name: 'Plywood sheet · 18 mm', sku: 'PLY-018-BR', category: 'Raw materials', onHand: 86, reserved: 24, uom: 'sheets', location: 'Main / B-14', min: 100, color: 'amber' },
  { id: 3, name: 'Ergo office chair', sku: 'FUR-CHR-04', category: 'Finished goods', onHand: 42, reserved: 12, uom: 'units', location: 'North / C-02', min: 20, color: 'blue' },
  { id: 4, name: 'M8 hex bolt · zinc', sku: 'FST-BLT-M8', category: 'Components', onHand: 12, reserved: 0, uom: 'boxes', location: 'Main / D-08', min: 24, color: 'rose' },
  { id: 5, name: 'Aluminium angle · 2 m', sku: 'ALU-ANG-2M', category: 'Raw materials', onHand: 328, reserved: 64, uom: 'units', location: 'Main / A-06', min: 80, color: 'violet' },
  { id: 6, name: 'Desk frame · black', sku: 'FUR-FRM-BK', category: 'Finished goods', onHand: 0, reserved: 0, uom: 'units', location: 'North / C-05', min: 15, color: 'slate' },
]

const seedOperations: Operation[] = [
  { id: 'WH/IN/00482', type: 'Receipt', partner: 'Metals & Co.', date: 'Today, 10:42 AM', status: 'Ready', warehouse: 'Main warehouse', items: 4 },
  { id: 'WH/OUT/00196', type: 'Delivery', partner: 'Northstar Furniture', date: 'Today, 09:18 AM', status: 'Waiting', warehouse: 'North warehouse', items: 7 },
  { id: 'WH/INT/00074', type: 'Transfer', partner: 'Main → Production', date: 'Today, 08:36 AM', status: 'In progress', warehouse: 'Main warehouse', items: 3 },
  { id: 'WH/ADJ/00031', type: 'Adjustment', partner: 'Cycle count · Zone A', date: 'Yesterday, 04:52 PM', status: 'Done', warehouse: 'Main warehouse', items: 2 },
]

const startingMovements: Movement[] = [
  { id: 1, reference: 'WH/IN/00482', type: 'Receipt', product: 'Steel rod · 12 mm', sku: 'STL-012-CR', warehouse: 'Main warehouse', location: 'Main / A-01', quantityDelta: 320, balanceAfter: 1240, occurredAt: 'Today, 10:42 AM' },
  { id: 2, reference: 'WH/INT/00074', type: 'Transfer in', product: 'Aluminium angle · 2 m', sku: 'ALU-ANG-2M', warehouse: 'Production floor', location: 'Production / A-01', quantityDelta: 40, balanceAfter: 328, occurredAt: 'Today, 08:36 AM' },
  { id: 3, reference: 'WH/OUT/00195', type: 'Delivery', product: 'Ergo office chair', sku: 'FUR-CHR-04', warehouse: 'North warehouse', location: 'North / C-02', quantityDelta: -8, balanceAfter: 42, occurredAt: 'Yesterday, 03:15 PM' },
  { id: 4, reference: 'WH/ADJ/00031', type: 'Adjustment', product: 'M8 hex bolt · zinc', sku: 'FST-BLT-M8', warehouse: 'Main warehouse', location: 'Main / D-08', quantityDelta: -3, balanceAfter: 12, occurredAt: 'Yesterday, 04:52 PM' },
]

const startingWarehouses: WarehouseItem[] = [
  { id: 1, name: 'Main warehouse', code: 'MAIN', address: 'Central distribution', active: true },
  { id: 2, name: 'North warehouse', code: 'NORTH', address: 'North district', active: true },
  { id: 3, name: 'Production floor', code: 'PROD', address: 'Manufacturing', active: true },
]

const navigation: { title: string; items: { label: Section; icon: typeof LayoutDashboard }[] }[] = [
  { title: 'OVERVIEW', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'INVENTORY', items: [{ label: 'Products', icon: Package }, { label: 'Receipts', icon: ArrowDownToLine }, { label: 'Delivery orders', icon: Truck }, { label: 'Internal transfers', icon: ArrowLeftRight }, { label: 'Adjustments', icon: SlidersHorizontal }, { label: 'Move history', icon: FileClock }] },
  { title: 'CONFIGURATION', items: [{ label: 'Warehouses', icon: Warehouse }, { label: 'Settings', icon: Settings }] },
]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('stocksense-session') === 'active' || localStorage.getItem('stocksense-session') === 'demo')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authOtp, setAuthOtp] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [section, setSection] = useState<Section>('Dashboard')
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('stocksense-products')
    return saved ? JSON.parse(saved) as Product[] : startingProducts
  })
  const [operations, setOperations] = useState<Operation[]>(() => {
    const saved = localStorage.getItem('stocksense-operations')
    return saved ? JSON.parse(saved) as Operation[] : seedOperations
  })
  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('stocksense-movements')
    return saved ? JSON.parse(saved) as Movement[] : startingMovements
  })
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(() => {
    const saved = localStorage.getItem('stocksense-warehouses')
    return saved ? JSON.parse(saved) as WarehouseItem[] : startingWarehouses
  })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [typeFilter, setTypeFilter] = useState('All operations')
  const [warehouseFilter, setWarehouseFilter] = useState('All warehouses')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [modal, setModal] = useState<'product' | 'operation' | 'warehouse' | 'profile' | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [operationType, setOperationType] = useState('Receipt')
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const [profileName, setProfileName] = useState('Olivia Rhye')

  useEffect(() => {
    const name = localStorage.getItem('stocksense-name')
    if (name) setProfileName(name)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !localStorage.getItem('stocksense-token')) return
    let cancelled = false
    async function loadInventory() {
      try {
        const [rawProducts, rawOperations] = await Promise.all([
          apiRequest<unknown[]>('/products'),
          apiRequest<unknown[]>('/operations'),
        ])
        const rawMovements = await apiRequest<Record<string, unknown>[]>('/movements')
          const rawWarehouses = await apiRequest<Record<string, unknown>[]>('/warehouses')
        const nextProducts = await Promise.all(rawProducts.map(async value => {
          const product = value as Record<string, unknown>
          const stock = await apiRequest<Record<string, unknown>[]>(`/products/${product.id}/stock`)
          const balance = stock.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
          return { id: Number(product.id), name: String(product.name), sku: String(product.sku), category: String(product.category), onHand: balance, reserved: 0, uom: String(product.unitOfMeasure), location: String(stock[0]?.location ?? 'Main / A-01'), min: Number(product.reorderPoint ?? 0), color: 'mint' } satisfies Product
        }))
        const nextOperations = rawOperations.map(value => {
          const operation = value as Record<string, unknown>
          const warehouse = operation.warehouse
          const lines = operation.lines as Record<string, unknown>[] | undefined
          return { backendId: Number(operation.id), id: String(operation.reference), type: String(operation.type).toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`), partner: String(operation.partner ?? 'Internal stock move'), date: new Date(String(operation.createdAt)).toLocaleString(), status: String(operation.status), warehouse: typeof warehouse === 'string' ? warehouse : String((warehouse as Record<string, unknown> | undefined)?.name ?? 'Main warehouse'), items: lines?.length ?? 0 } satisfies Operation
        })
        const nextMovements = rawMovements.map(toMovement)
        const nextWarehouses = rawWarehouses.map(warehouse => ({ id: Number(warehouse.id), name: String(warehouse.name), code: String(warehouse.code), address: String(warehouse.address ?? ''), active: Boolean(warehouse.active) } satisfies WarehouseItem))
        if (!cancelled) {
          setProducts(nextProducts); setOperations(nextOperations); setMovements(nextMovements); setWarehouses(nextWarehouses)
          localStorage.setItem('stocksense-products', JSON.stringify(nextProducts))
          localStorage.setItem('stocksense-operations', JSON.stringify(nextOperations))
          localStorage.setItem('stocksense-movements', JSON.stringify(nextMovements))
                  localStorage.setItem('stocksense-warehouses', JSON.stringify(nextWarehouses))
        }
      } catch (error) {
        if (!cancelled) flash(error instanceof Error ? error.message : 'Could not sync inventory')
      }
    }
    void loadInventory()
    return () => { cancelled = true }
  }, [isAuthenticated])

  const stockUnits = products.reduce((sum, product) => sum + product.onHand, 0)
  const stockedProducts = products.filter(product => product.onHand > 0).length
  const lowStock = products.filter(product => product.onHand <= product.min).length
  const filteredProducts = useMemo(() => products.filter(product => `${product.name} ${product.sku} ${product.category} ${product.location}`.toLowerCase().includes(query.toLowerCase()) && (categoryFilter === 'All categories' || product.category === categoryFilter) && (locationFilter === 'All locations' || product.location.startsWith(locationFilter))), [products, query, categoryFilter, locationFilter])
  const filteredOperations = useMemo(() => operations.filter(operation => {
    const matchesText = `${operation.id} ${operation.partner} ${operation.type}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (statusFilter === 'All statuses' || operation.status === statusFilter) && (typeFilter === 'All operations' || operation.type === typeFilter) && (warehouseFilter === 'All warehouses' || operation.warehouse === warehouseFilter)
  }), [operations, query, statusFilter, typeFilter, warehouseFilter])
  const filteredMovements = useMemo(() => movements.filter(movement => `${movement.reference} ${movement.product} ${movement.sku} ${movement.warehouse} ${movement.location} ${movement.type}`.toLowerCase().includes(query.toLowerCase())), [movements, query])

  function persistProducts(next: Product[]) { setProducts(next); localStorage.setItem('stocksense-products', JSON.stringify(next)) }
  function persistOperations(next: Operation[]) { setOperations(next); localStorage.setItem('stocksense-operations', JSON.stringify(next)) }
  function persistMovements(next: Movement[]) { setMovements(next); localStorage.setItem('stocksense-movements', JSON.stringify(next)) }
    function persistWarehouses(next: WarehouseItem[]) { setWarehouses(next); localStorage.setItem('stocksense-warehouses', JSON.stringify(next)) }
  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 3200) }
  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const initialStock = Number(form.get('stock') ?? 0)
    const next: Product = { id: editingProduct?.id ?? Date.now(), name: String(form.get('name')), sku: String(form.get('sku')).toUpperCase(), category: String(form.get('category')), onHand: editingProduct?.onHand ?? initialStock, reserved: editingProduct?.reserved ?? 0, uom: String(form.get('uom')), location: editingProduct?.location ?? String(form.get('location')), min: Number(form.get('min') || 0), color: editingProduct?.color ?? 'mint' }
    if (localStorage.getItem('stocksense-token')) {
      try {
        const saved = await apiRequest(editingProduct ? `/products/${next.id}` : '/products', { method: editingProduct ? 'PUT' : 'POST', body: JSON.stringify({ name: next.name, sku: next.sku, category: next.category, unitOfMeasure: next.uom, reorderPoint: next.min }) }) as Record<string, unknown>
        next.id = Number(saved.id)
        if (!editingProduct && initialStock > 0) {
          const operation = await apiRequest('/operations', { method: 'POST', body: JSON.stringify({ type: 'RECEIPT', partner: 'Opening stock', warehouseId: 1, location: next.location, lines: [{ productId: next.id, quantity: next.onHand }] }) }) as Record<string, unknown>
          await apiRequest(`/operations/${operation.id}/validate`, { method: 'POST' })
        }
      } catch (error) { flash(error instanceof Error ? error.message : 'Could not create product'); return }
    }
    persistProducts(editingProduct ? products.map(product => product.id === next.id ? next : product) : [next, ...products]); setModal(null); setEditingProduct(null); flash(editingProduct ? `${next.name} updated` : `${next.name} added to products`)
  }
  async function createOperation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const selectedProduct = products.find(product => product.id === Number(form.get('product')))
    const warehouse = String(form.get('warehouse') || 'Main warehouse')
    const quantity = Number(form.get('quantity') ?? 1)
    if (localStorage.getItem('stocksense-token')) {
      try {
        const operation = await apiRequest('/operations', { method: 'POST', body: JSON.stringify({ type: operationType.toUpperCase(), partner: String(form.get('partner')), warehouseId: warehouse === 'North warehouse' ? 2 : warehouse === 'Production floor' ? 3 : 1, destinationWarehouseId: operationType === 'Transfer' ? Number(form.get('destinationWarehouse')) : null, location: selectedProduct?.location ?? 'Default', destinationLocation: String(form.get('destinationLocation') || 'Production / A-01'), lines: [{ productId: selectedProduct?.id, quantity }] }) }) as Record<string, unknown>
        const prefix = operationType === 'Receipt' ? 'IN' : operationType === 'Delivery' ? 'OUT' : operationType === 'Transfer' ? 'INT' : 'ADJ'
        const next: Operation = { backendId: Number(operation.id), id: String(operation.reference ?? `WH/${prefix}/NEW`), type: operationType, partner: String(form.get('partner')), date: 'Just now', status: 'Draft', warehouse, items: 1, productId: selectedProduct?.id, quantity }
        persistOperations([next, ...operations]); setModal(null); flash(`${operationType} created as ${next.id}`); return
      } catch (error) { flash(error instanceof Error ? error.message : 'Could not create operation'); return }
    }
    const prefix = operationType === 'Receipt' ? 'IN' : operationType === 'Delivery' ? 'OUT' : operationType === 'Transfer' ? 'INT' : 'ADJ'
    const next: Operation = { id: `WH/${prefix}/${String(Date.now()).slice(-5)}`, type: operationType, partner: String(form.get('partner') || 'New stock operation'), date: 'Just now', status: 'Draft', warehouse, items: 1, productId: selectedProduct?.id, quantity }
    persistOperations([next, ...operations]); setModal(null); flash(`${operationType} created as ${next.id}`)
  }
  async function createWarehouse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const next: WarehouseItem = { id: Date.now(), name: String(form.get('name')), code: String(form.get('code')).toUpperCase(), address: String(form.get('address') ?? ''), active: true }
    if (localStorage.getItem('stocksense-token')) {
      try {
        const created = await apiRequest('/warehouses', { method: 'POST', body: JSON.stringify({ name: next.name, code: next.code, address: next.address }) }) as Record<string, unknown>
        next.id = Number(created.id)
      } catch (error) { flash(error instanceof Error ? error.message : 'Could not create warehouse'); return }
    }
    persistWarehouses([next, ...warehouses]); setModal(null); flash(`${next.name} added`)
  }
  async function validateOperation(operation: Operation) {
    if (operation.backendId && localStorage.getItem('stocksense-token')) {
      try {
        await apiRequest(`/operations/${operation.backendId}/validate`, { method: 'POST' })
        const [rawProducts, rawOperations] = await Promise.all([apiRequest<Record<string, unknown>[]>('/products'), apiRequest<Record<string, unknown>[]>('/operations')])
        const rawMovements = await apiRequest<Record<string, unknown>[]>('/movements')
        const nextProducts = await Promise.all(rawProducts.map(async product => {
          const stock = await apiRequest<Record<string, unknown>[]>(`/products/${product.id}/stock`)
          return { id: Number(product.id), name: String(product.name), sku: String(product.sku), category: String(product.category), onHand: stock.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0), reserved: 0, uom: String(product.unitOfMeasure), location: String(stock[0]?.location ?? 'Main / A-01'), min: Number(product.reorderPoint ?? 0), color: 'mint' } satisfies Product
        }))
        const nextOperations = rawOperations.map(item => ({ backendId: Number(item.id), id: String(item.reference), type: String(item.type).toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`), partner: String(item.partner ?? 'Internal stock move'), date: new Date(String(item.createdAt)).toLocaleString(), status: String(item.status), warehouse: typeof item.warehouse === 'string' ? item.warehouse : String((item.warehouse as Record<string, unknown> | undefined)?.name ?? 'Main warehouse'), items: (item.lines as unknown[] | undefined)?.length ?? 0 } satisfies Operation))
        const nextMovements = rawMovements.map(toMovement)
        setProducts(nextProducts); setOperations(nextOperations); setMovements(nextMovements)
        localStorage.setItem('stocksense-products', JSON.stringify(nextProducts)); localStorage.setItem('stocksense-operations', JSON.stringify(nextOperations)); localStorage.setItem('stocksense-movements', JSON.stringify(nextMovements))
        flash(`${operation.id} validated and ledger updated`); return
      } catch (error) { flash(error instanceof Error ? error.message : 'Could not validate operation'); return }
    }
    const updated = { ...operation, status: 'Done' }
    if (operation.productId && operation.quantity !== undefined && ['Receipt', 'Delivery', 'Adjustment'].includes(operation.type)) {
      const target = products.find(product => product.id === operation.productId)
      if (target) {
        const delta = operation.type === 'Receipt' ? operation.quantity : operation.type === 'Delivery' ? -operation.quantity : operation.quantity - target.onHand
        const stock = Math.max(0, target.onHand + delta)
        persistProducts(products.map(product => product.id === target.id ? { ...product, onHand: stock } : product))
        persistMovements([{ id: Date.now(), reference: operation.id, type: operation.type, product: target.name, sku: target.sku, warehouse: operation.warehouse, location: target.location, quantityDelta: delta, balanceAfter: stock, occurredAt: 'Just now' }, ...movements])
      }
    }
    persistOperations(operations.map(item => item.id === operation.id ? updated : item)); flash(`${operation.id} validated and ledger updated`)
  }

  const pageTitle = section === 'Dashboard' ? 'Inventory overview' : section
  const pageDescription = section === 'Dashboard' ? 'Your stock, movements, and what needs attention.' : section === 'Products' ? 'Manage your catalogue, stock levels, and reorder points.' : `Track and manage your ${section.toLowerCase()} across every warehouse.`
  const isDashboard = section === 'Dashboard'

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthError(''); setAuthMessage('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? authEmail).trim().toLowerCase()
    setAuthEmail(email)
    try {
      if (authMode === 'login') {
        const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: form.get('password') }) }) as { accessToken: string; user: { fullName: string } }
        localStorage.setItem('stocksense-token', result.accessToken); localStorage.setItem('stocksense-session', 'active'); localStorage.setItem('stocksense-name', result.user.fullName)
        setProfileName(result.user.fullName); setIsAuthenticated(true); return
      }
      if (authMode === 'signup') {
        const result = await apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ fullName: form.get('fullName'), email, password: form.get('password') }) }) as { accessToken: string; user: { fullName: string } }
        localStorage.setItem('stocksense-token', result.accessToken); localStorage.setItem('stocksense-session', 'active'); localStorage.setItem('stocksense-name', result.user.fullName)
        setProfileName(result.user.fullName); setIsAuthenticated(true); return
      }
      if (authMode === 'reset') {
        const result = await apiRequest('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }) as { message: string; demoOtp?: string }
        setAuthOtp(result.demoOtp ?? ''); setAuthMessage(result.demoOtp ? `Development reset code: ${result.demoOtp}` : result.message); setAuthMode('verify'); return
      }
      await apiRequest('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ email, code: form.get('code'), newPassword: form.get('newPassword') }) })
      setAuthMode('login'); setAuthMessage('Password updated. Sign in with your new password.')
    } catch (error) {
      if (error instanceof TypeError && authMode === 'signup') {
        const accounts = JSON.parse(localStorage.getItem('stocksense-local-users') ?? '[]') as LocalAccount[]
        if (accounts.some(account => account.email === email)) { setAuthError('An account with this email already exists in this browser.'); return }
        const fullName = String(form.get('fullName') ?? '').trim()
        const password = String(form.get('password') ?? '')
        const passwordSalt = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
        accounts.push({ fullName, email, passwordSalt, passwordHash: await hashPassword(password, passwordSalt) })
        localStorage.setItem('stocksense-local-users', JSON.stringify(accounts)); localStorage.setItem('stocksense-session', 'demo'); localStorage.setItem('stocksense-name', fullName)
        setProfileName(fullName); setIsAuthenticated(true); flash('Demo account created in this browser. Start the API to save it to MySQL.'); return
      }
      if (error instanceof TypeError && authMode === 'login') {
        const accounts = JSON.parse(localStorage.getItem('stocksense-local-users') ?? '[]') as LocalAccount[]
        const account = accounts.find(candidate => candidate.email === email)
        if (account && account.passwordHash === await hashPassword(String(form.get('password') ?? ''), account.passwordSalt)) {
          localStorage.setItem('stocksense-session', 'demo'); localStorage.setItem('stocksense-name', account.fullName); setProfileName(account.fullName); setIsAuthenticated(true); return
        }
        if (!account && email === 'manager@stocksense.app' && form.get('password') === 'stock1234') {
          localStorage.setItem('stocksense-session', 'demo'); localStorage.setItem('stocksense-name', 'Olivia Rhye'); setProfileName('Olivia Rhye'); setIsAuthenticated(true); return
        }
        setAuthError('Account not found or password is incorrect. Start the API to use MySQL accounts.'); return
      }
      setAuthError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  function signOut() {
    if (localStorage.getItem('stocksense-token')) void apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
    localStorage.removeItem('stocksense-token'); localStorage.removeItem('stocksense-session'); setIsAuthenticated(false); setModal(null); setAuthMode('login'); flash('Signed out')
  }

  if (!isAuthenticated) return <AuthGate mode={authMode} setMode={mode => { setAuthError(''); setAuthMessage(''); setAuthMode(mode) }} email={authEmail} setEmail={setAuthEmail} otp={authOtp} setOtp={setAuthOtp} message={authMessage} error={authError} onSubmit={submitAuth} />

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={21} strokeWidth={2.2} /></div><span>stocksense</span><button className="icon-btn sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <button className="workspace-switch"><span className="workspace-icon">A</span><span className="workspace-copy"><b>Acme Industries</b><small>Workspace</small></span><ChevronDown size={15} /></button>
      <div className="sidebar-nav">{navigation.map(group => <div className="nav-group" key={group.title}><div className="nav-label">{group.title}</div>{group.items.map(item => <button key={item.label} className={`nav-item ${section === item.label ? 'active' : ''}`} onClick={() => { setSection(item.label); setMobileNav(false) }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Products' && <span className="nav-count">{products.length}</span>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><div><b>Need a hand?</b><small>Visit the help center</small></div><ArrowUpRight size={15} /></div><button className="user-profile" onClick={() => setModal('profile')}><div className="avatar">OR</div><span className="user-copy"><b>{profileName}</b><small>Inventory manager</small></span><Ellipsis size={18} /></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><span>Workspace</span><ChevronRight size={14} /><b>{section}</b></div><div className="topbar-actions"><div className="global-search"><Search size={16} /><input placeholder="Search anything..." value={query} onChange={event => setQuery(event.target.value)} /><kbd><Command size={11} /> K</kbd></div><button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => flash('You’re all caught up')}><Bell size={18} /><i /></button><div className="top-divider" /><button className="top-avatar" aria-label="Open profile" onClick={() => setModal('profile')}>OR</button></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> LIVE INVENTORY</div><h1>{pageTitle}</h1><p>{pageDescription}</p></div><div className="heading-actions">{!['Warehouses', 'Settings'].includes(section) && <button className="button button-secondary" onClick={() => { const csv = ['SKU,Product,Category,On hand,Reserved,Location', ...products.map(product => `${product.sku},${product.name},${product.category},${product.onHand},${product.reserved},${product.location}`)].join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'stocksense-inventory.csv'; link.click(); URL.revokeObjectURL(link.href); flash('Inventory export downloaded') }}><Download size={16} /> Export</button>}{section !== 'Settings' && <button className="button button-primary" onClick={() => { setOperationType(section === 'Delivery orders' ? 'Delivery' : section === 'Internal transfers' ? 'Transfer' : section === 'Adjustments' ? 'Adjustment' : 'Receipt'); setModal(section === 'Products' ? 'product' : section === 'Warehouses' ? 'warehouse' : 'operation') }}><Plus size={17} /> {section === 'Products' ? 'New product' : section === 'Warehouses' ? 'New warehouse' : 'New operation'}</button>}</div></div>

        {isDashboard && <><section className="kpi-grid" aria-label="Inventory summary"><Kpi icon={Package} label="Products in stock" value={String(stockedProducts).padStart(2, '0')} trend={`${stockUnits.toLocaleString()} total units`} note="across all locations" tone="green" chart="M2 23 C12 20 15 25 25 17 S38 22 48 10 S62 17 74 7 S86 12 98 2" /><Kpi icon={TriangleAlert} label="Low / out of stock" value={String(lowStock).padStart(2, '0')} trend="Reorder needed" note="below minimum level" tone="orange" chart="M2 5 C13 9 15 3 25 14 S37 8 48 19 S63 10 74 21 S87 15 98 25" /><Kpi icon={ArrowDownToLine} label="Pending receipts" value={String(operations.filter(item => item.type === 'Receipt' && item.status !== 'Done').length).padStart(2, '0')} trend="Inbound stock" note="awaiting validation" tone="blue" chart="M2 22 C13 23 15 16 25 18 S40 5 49 12 S61 8 74 10 S88 3 98 4" /><Kpi icon={Truck} label="Pending deliveries" value={String(operations.filter(item => item.type === 'Delivery' && item.status !== 'Done').length).padStart(2, '0')} trend="Outbound queue" note="ready to process" tone="violet" chart="M2 22 C10 21 17 9 26 16 S38 24 49 15 S61 17 73 6 S87 13 98 2" /><Kpi icon={ArrowLeftRight} label="Transfers scheduled" value={String(operations.filter(item => item.type === 'Transfer' && item.status !== 'Done').length).padStart(2, '0')} trend="Internal moves" note="across locations" tone="green" chart="M2 22 C10 21 17 17 26 12 S38 19 49 11 S61 16 73 8 S87 11 98 3" /></section>

          <section className="insight-row"><div className="chart-panel"><div className="panel-heading"><div><span className="section-kicker">STOCK MOVEMENT</span><h2>Inventory activity</h2></div><select className="select-compact" aria-label="Activity range"><option>Last 7 days</option><option>Last 30 days</option><option>This year</option></select></div><div className="chart-legend"><span><i className="legend-in" /> Stock in <b>+1,284</b></span><span><i className="legend-out" /> Stock out <b>−842</b></span><span className="chart-total"><TrendingUp size={14} /> 12.4%</span></div><div className="chart-wrap"><div className="y-labels"><span>1.5k</span><span>1.0k</span><span>500</span><span>0</span></div><div className="chart-main"><div className="grid-lines"><i /><i /><i /><i /></div><svg className="activity-chart" viewBox="0 0 760 170" preserveAspectRatio="none" role="img" aria-label="Stock in and out activity over the last seven days"><defs><linearGradient id="green-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#78b997" stopOpacity=".22" /><stop offset="1" stopColor="#78b997" stopOpacity="0" /></linearGradient></defs><path d="M0 128 C50 116 72 124 110 93 S178 110 218 71 S288 92 326 61 S397 74 435 50 S500 72 544 40 S615 65 652 30 S713 49 760 15 L760 170 L0 170Z" fill="url(#green-fill)" /><path d="M0 128 C50 116 72 124 110 93 S178 110 218 71 S288 92 326 61 S397 74 435 50 S500 72 544 40 S615 65 652 30 S713 49 760 15" fill="none" stroke="#3b8967" strokeWidth="2.5" /><path d="M0 151 C43 144 75 152 111 136 S174 145 218 123 S284 143 326 118 S396 130 435 104 S502 126 544 97 S614 118 652 88 S715 110 760 77" fill="none" stroke="#e6a46c" strokeWidth="2" strokeDasharray="5 5" /></svg><div className="x-labels"><span>Mon, 14</span><span>Tue, 15</span><span>Wed, 16</span><span>Thu, 17</span><span>Fri, 18</span><span>Sat, 19</span><span>Sun, 20</span></div></div></div></div>
            <div className="attention-panel"><div className="panel-heading"><div><span className="section-kicker">ACTION REQUIRED</span><h2>Needs attention</h2></div><span className="attention-count">{lowStock}</span></div><div className="attention-list">{products.filter(product => product.onHand <= product.min).slice(0, 3).map(product => <div className="attention-item" key={product.id}><div className={`product-mini ${product.color}`}><Package size={17} /></div><div className="attention-copy"><b>{product.name}</b><small>{product.sku}</small></div><div className="attention-stock"><b>{product.onHand}</b><small>of {product.min} min</small></div><ChevronRight size={16} /></div>)}</div><button className="text-link" onClick={() => { setSection('Products'); setQuery('') }}>Review all stock alerts <ArrowUpRight size={14} /></button></div></section>

          <OperationsTable operations={filteredOperations} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} warehouseFilter={warehouseFilter} setWarehouseFilter={setWarehouseFilter} onValidate={validateOperation} onCreate={() => setModal('operation')} />
        </>}

        {section === 'Products' && <section className="data-panel product-panel"><div className="table-toolbar"><div><span className="section-kicker">CATALOGUE</span><h2>All products <span className="title-count">{filteredProducts.length}</span></h2></div><div className="toolbar-filters"><label className="table-search"><Search size={15} /><input placeholder="Search products..." value={query} onChange={event => setQuery(event.target.value)} /></label><select className="filter-select" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option>All categories</option><option>Raw materials</option><option>Finished goods</option><option>Components</option><option>Packaging</option></select><select className="filter-select" value={locationFilter} onChange={event => setLocationFilter(event.target.value)} aria-label="Filter by location"><option>All locations</option><option>Main</option><option>North</option><option>Production</option></select><button className="button button-secondary filter-button" onClick={() => { setQuery(''); setCategoryFilter('All categories'); setLocationFilter('All locations') }}><Filter size={15} /> Clear</button></div></div><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>CATEGORY</th><th>ON HAND</th><th>RESERVED</th><th>LOCATION</th><th>STATUS</th><th /></tr></thead><tbody>{filteredProducts.map(product => <tr key={product.id}><td><div className="product-cell"><div className={`product-mini ${product.color}`}><Package size={16} /></div><b>{product.name}</b></div></td><td className="mono">{product.sku}</td><td>{product.category}</td><td><b>{product.onHand.toLocaleString()}</b> <span className="muted">{product.uom}</span></td><td>{product.reserved} <span className="muted">{product.uom}</span></td><td>{product.location}</td><td><StatusPill status={product.onHand === 0 ? 'Out of stock' : product.onHand <= product.min ? 'Low stock' : 'In stock'} /></td><td><button className="icon-btn row-action" title="Edit product" onClick={() => { setEditingProduct(product); setModal('product') }}><Pencil size={16} /></button></td></tr>)}</tbody></table></div>{filteredProducts.length === 0 && <div className="empty-state">No products match this search.</div>}</section>}
        {section === 'Move history' && <MovementTable movements={filteredMovements} />}
          {section === 'Warehouses' && <WarehouseTable warehouses={warehouses} products={products} onCreate={() => setModal('warehouse')} />}
        {section === 'Settings' && <SettingsPanel />}
        {section !== 'Dashboard' && section !== 'Products' && section !== 'Move history' && section !== 'Warehouses' && section !== 'Settings' && <OperationsTable operations={filteredOperations} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} warehouseFilter={warehouseFilter} setWarehouseFilter={setWarehouseFilter} onValidate={validateOperation} onCreate={() => { setOperationType(section === 'Delivery orders' ? 'Delivery' : section === 'Internal transfers' ? 'Transfer' : section === 'Adjustments' ? 'Adjustment' : 'Receipt'); setModal('operation') }} />}
        <footer className="page-footer"><span><span className="footer-dot" /> All systems operational</span><span>Last synced just now <span className="footer-divider">·</span> StockSense v1.0</span></footer>
      </div>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setModal(null); setEditingProduct(null) } }}><div className="modal"><div className="modal-heading"><div><span className="section-kicker">{modal === 'profile' ? 'YOUR ACCOUNT' : modal === 'product' ? 'CATALOGUE' : modal === 'warehouse' ? 'LOCATIONS' : 'INVENTORY OPERATIONS'}</span><h2>{modal === 'profile' ? 'Profile settings' : modal === 'product' ? editingProduct ? 'Edit product' : 'Add a product' : modal === 'warehouse' ? 'Add a warehouse' : `New ${operationType.toLowerCase()}`}</h2></div><button className="icon-btn" onClick={() => { setModal(null); setEditingProduct(null) }} aria-label="Close dialog"><X size={19} /></button></div>
      {modal === 'warehouse' && <form className="modal-form" onSubmit={createWarehouse}><label>Warehouse name<input name="name" placeholder="e.g. East warehouse" required /></label><div className="form-row"><label>Warehouse code<input name="code" placeholder="EAST" maxLength={12} required /></label><label>Address<input name="address" placeholder="City or facility" /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary"><Plus size={16} /> Create warehouse</button></div></form>}
      {modal === 'product' && <form className="modal-form" onSubmit={createProduct}><label>Product name<input name="name" placeholder="e.g. Steel rod · 12 mm" defaultValue={editingProduct?.name ?? ''} required /></label><div className="form-row"><label>SKU / code<input name="sku" placeholder="STL-012-CR" defaultValue={editingProduct?.sku ?? ''} required /></label><label>Category<select name="category" defaultValue={editingProduct?.category ?? 'Raw materials'}><option>Raw materials</option><option>Finished goods</option><option>Components</option><option>Packaging</option></select></label></div><div className="form-row"><label>{editingProduct ? 'Current stock' : 'Initial stock'}<input name="stock" type="number" min="0" defaultValue={editingProduct?.onHand ?? 0} readOnly={Boolean(editingProduct)} /></label><label>Unit of measure<select name="uom" defaultValue={editingProduct?.uom ?? 'units'}><option>units</option><option>kg</option><option>litres</option><option>sheets</option><option>boxes</option></select></label></div><div className="form-row"><label>Warehouse / location<input name="location" defaultValue={editingProduct?.location ?? 'Main / A-01'} readOnly={Boolean(editingProduct)} /></label><label>Reorder point<input name="min" type="number" min="0" defaultValue={editingProduct?.min ?? 10} /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => { setModal(null); setEditingProduct(null) }}>Cancel</button><button className="button button-primary">{editingProduct ? 'Save changes' : <><Plus size={16} /> Create product</>}</button></div></form>}
      {modal === 'operation' && <form className="modal-form" onSubmit={createOperation}><label>Operation type<select value={operationType} onChange={event => setOperationType(event.target.value)}><option>Receipt</option><option>Delivery</option><option>Transfer</option><option>Adjustment</option></select></label><label>{operationType === 'Receipt' ? 'Supplier' : operationType === 'Delivery' ? 'Customer' : operationType === 'Transfer' ? 'Transfer reference' : 'Reason'}<input name="partner" placeholder={operationType === 'Receipt' ? 'Supplier name' : operationType === 'Delivery' ? 'Customer name' : operationType === 'Transfer' ? 'e.g. Main → Production' : 'e.g. Cycle count'} required /></label><div className="form-row"><label>Warehouse<select name="warehouse"><option>Main warehouse</option><option>North warehouse</option><option>Production floor</option></select></label><label>Product<select name="product">{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label></div>{operationType === 'Transfer' && <div className="form-row"><label>Destination warehouse<select name="destinationWarehouse"><option value="2">North warehouse</option><option value="3">Production floor</option><option value="1">Main warehouse</option></select></label><label>Destination location<input name="destinationLocation" defaultValue="Production / A-01" /></label></div>}<div className="form-row"><label>{operationType === 'Adjustment' ? 'Counted quantity' : 'Quantity'}<input name="quantity" type="number" min="0" step="any" defaultValue="1" required /></label><label>Scheduled date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)}>Cancel</button><button className="button button-primary"><Plus size={16} /> Create {operationType.toLowerCase()}</button></div></form>}
      {modal === 'profile' && <form className="modal-form" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name')); setProfileName(name); localStorage.setItem('stocksense-name', name); setModal(null); flash('Profile updated') }}><div className="profile-large">OR</div><label>Full name<input name="name" defaultValue={profileName} required /></label><label>Email address<input type="email" defaultValue="olivia@acmeindustries.com" /></label><label>Role<input value="Inventory manager" readOnly /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={signOut}><LogOut size={15} /> Log out</button><button className="button button-primary">Save profile</button></div></form>}
    </div></div>}
    {notice && <div className="toast"><Check size={17} />{notice}</div>}
  </div>
}

function MovementTable({ movements }: { movements: Movement[] }) {
  return <section className="data-panel movement-panel"><div className="table-toolbar"><div><span className="section-kicker">AUDIT TRAIL</span><h2>Stock movement ledger <span className="title-count">{movements.length}</span></h2></div><div className="ledger-note"><Clock3 size={14} /> Most recent first</div></div><div className="table-scroll"><table><thead><tr><th>DATE</th><th>PRODUCT</th><th>REFERENCE</th><th>WAREHOUSE / LOCATION</th><th>TYPE</th><th>CHANGE</th><th>BALANCE AFTER</th></tr></thead><tbody>{movements.map(movement => <tr key={movement.id}><td className="muted">{movement.occurredAt}</td><td><div className="ledger-product"><b>{movement.product}</b><small>{movement.sku}</small></div></td><td className="mono ref-cell">{movement.reference}</td><td><div className="ledger-product"><b>{movement.warehouse}</b><small>{movement.location}</small></div></td><td><span className={`type-icon ${movement.quantityDelta >= 0 ? 'receipt' : 'delivery'}`}>{movement.quantityDelta >= 0 ? <ArrowDownToLine size={14} /> : <Truck size={14} />}</span>{movement.type}</td><td><b className={movement.quantityDelta >= 0 ? 'movement-positive' : 'movement-negative'}>{movement.quantityDelta > 0 ? '+' : ''}{movement.quantityDelta}</b></td><td><b>{movement.balanceAfter}</b></td></tr>)}</tbody></table></div>{movements.length === 0 && <div className="empty-state"><FileClock size={23} /><b>No stock movements yet</b><span>Validated inventory operations will be recorded here.</span></div>}</section>
}

function WarehouseTable({ warehouses, products, onCreate }: { warehouses: WarehouseItem[]; products: Product[]; onCreate: () => void }) {
  function productPrefix(name: string) { return name.startsWith('Main') ? 'Main' : name.startsWith('North') ? 'North' : 'Production' }
  return <section className="data-panel warehouse-panel"><div className="table-toolbar"><div><span className="section-kicker">LOCATIONS</span><h2>Warehouses <span className="title-count">{warehouses.length}</span></h2></div><button className="button button-primary" onClick={onCreate}><Plus size={15} /> Add warehouse</button></div><div className="table-scroll"><table><thead><tr><th>WAREHOUSE</th><th>CODE</th><th>ADDRESS</th><th>PRODUCTS</th><th>STOCK UNITS</th><th>STATUS</th></tr></thead><tbody>{warehouses.map(warehouse => { const prefix = productPrefix(warehouse.name); const matching = products.filter(product => product.location.startsWith(prefix)); return <tr key={warehouse.id}><td><div className="product-cell"><div className="warehouse-cell-icon"><Warehouse size={16} /></div><b>{warehouse.name}</b></div></td><td className="mono">{warehouse.code}</td><td>{warehouse.address || '—'}</td><td>{matching.length}</td><td><b>{matching.reduce((sum, product) => sum + product.onHand, 0).toLocaleString()}</b></td><td><StatusPill status={warehouse.active ? 'In stock' : 'Canceled'} /></td></tr> })}</tbody></table></div></section>
}

function SettingsPanel() {
  const [alerts, setAlerts] = useState(() => localStorage.getItem('stocksense-low-stock-alerts') !== 'false')
  const [reorderPoint, setReorderPoint] = useState(() => Number(localStorage.getItem('stocksense-default-reorder') ?? 10))
  return <section className="settings-panel"><div className="settings-section"><div><span className="section-kicker">INVENTORY RULES</span><h2>Stock preferences</h2><p>Default controls for new products and stock alerts.</p></div><label className="settings-row"><span><b>Low-stock notifications</b><small>Alert when a product reaches its reorder point.</small></span><input type="checkbox" checked={alerts} onChange={event => { setAlerts(event.target.checked); localStorage.setItem('stocksense-low-stock-alerts', String(event.target.checked)) }} /></label><label className="settings-row"><span><b>Default reorder point</b><small>Applied when a new product is created.</small></span><input className="setting-number" type="number" min="0" value={reorderPoint} onChange={event => { setReorderPoint(Number(event.target.value)); localStorage.setItem('stocksense-default-reorder', event.target.value) }} /></label></div><div className="settings-section account-settings"><span className="section-kicker">WORKSPACE</span><h2>Acme Industries</h2><p>Inventory operations workspace · Manager access</p><div className="settings-row"><span><b>Authentication</b><small>Passwords are protected and API access uses expiring sessions.</small></span><span className="status-pill in-stock"><i />Active</span></div></div></section>
}

function AuthGate({ mode, setMode, email, setEmail, otp, setOtp, message, error, onSubmit }: { mode: AuthMode; setMode: (mode: AuthMode) => void; email: string; setEmail: (email: string) => void; otp: string; setOtp: (otp: string) => void; message: string; error: string; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const heading = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Check your inbox'
  const description = mode === 'login' ? 'Sign in to your inventory workspace.' : mode === 'signup' ? 'Set up your StockSense workspace access.' : mode === 'reset' ? 'We’ll send a one-time code to your account email.' : 'Enter the one-time code and choose a new password.'
  return <main className="auth-shell"><div className="auth-art"><div className="auth-brand"><div className="brand-mark"><Boxes size={21} /></div><span>stocksense</span></div><div className="auth-art-content"><div className="auth-overline"><span className="live-dot" /> INVENTORY, IN SYNC</div><h1>Know what’s<br />moving.</h1><p>One clear view of every product, warehouse, and stock movement.</p><div className="auth-motif"><div className="motif-grid"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="motif-label"><span>LIVE STOCK LEVELS</span><b>Everything in its place <ArrowUpRight size={15} /></b></div></div></div><div className="auth-art-footer"><span>STOCKSENSE INVENTORY PLATFORM</span><span>01 / 04</span></div></div><div className="auth-side"><div className="auth-mobile-brand"><div className="brand-mark"><Boxes size={20} /></div><span>stocksense</span></div><div className="auth-form-wrap"><div className="auth-heading"><span className="section-kicker">{mode === 'signup' ? 'GET STARTED' : mode === 'verify' || mode === 'reset' ? 'ACCOUNT RECOVERY' : 'SECURE WORKSPACE'}</span><h2>{heading}</h2><p>{description}</p></div><form className="auth-form" onSubmit={onSubmit}>{mode === 'signup' && <label>Full name<input name="fullName" placeholder="Your name" autoComplete="name" required /></label>}<label>Email address<input name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required /></label>{mode === 'login' && <><label className="auth-password-label"><span>Password</span><button type="button" className="auth-link" onClick={() => setMode('reset')}>Forgot password?</button></label><input className="auth-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required /></>}{mode === 'signup' && <label>Password<input name="password" type="password" minLength={8} placeholder="At least 8 characters" autoComplete="new-password" required /></label>}{mode === 'verify' && <><label>One-time code<input name="code" value={otp} onChange={event => setOtp(event.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" required /></label><label>New password<input name="newPassword" type="password" minLength={8} placeholder="At least 8 characters" required /></label></>}{message && <div className="auth-message">{message}</div>}{error && <div className="auth-error"><TriangleAlert size={14} />{error}</div>}<button className="button button-primary auth-submit">{mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset code' : 'Update password'}<ArrowUpRight size={15} /></button></form>{mode === 'login' && <div className="demo-credentials"><span>DEMO ACCESS</span><b>manager@stocksense.app</b><small>Password: stock1234</small></div>}<div className="auth-switch">{mode === 'login' ? <>New to StockSense? <button onClick={() => setMode('signup')}>Create an account</button></> : mode === 'signup' ? <>Already have an account? <button onClick={() => setMode('login')}>Sign in</button></> : <button onClick={() => setMode('login')}>Back to sign in</button>}</div></div><div className="auth-legal">© 2026 StockSense <span>·</span> Inventory operations</div></div></main>
}

function Kpi({ icon: Icon, label, value, trend, note, tone, chart }: { icon: typeof Package; label: string; value: string; trend: string; note: string; tone: string; chart: string }) {
  return <article className="kpi-card"><div className="kpi-top"><div className={`kpi-icon ${tone}`}><Icon size={18} strokeWidth={1.9} /></div><button className="icon-btn kpi-more" aria-label={`${label} information`} title={note}><Ellipsis size={18} /></button></div><div className="kpi-value">{value}</div><div className="kpi-label">{label}</div><div className={`kpi-foot ${tone}`}><span className="trend-tag">{tone === 'orange' ? <TriangleAlert size={12} /> : <TrendingUp size={12} />}{trend}</span><span>{note}</span></div><svg className={`sparkline ${tone}`} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d={chart} fill="none" stroke="currentColor" strokeWidth="2" /></svg></article>
}

function StatusPill({ status }: { status: string }) {
  const className = status.toLowerCase().replace(/ /g, '-')
  return <span className={`status-pill ${className}`}><i />{status}</span>
}

function OperationsTable({ operations, query, setQuery, statusFilter, setStatusFilter, typeFilter, setTypeFilter, warehouseFilter, setWarehouseFilter, onValidate, onCreate }: { operations: Operation[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; typeFilter: string; setTypeFilter: (value: string) => void; warehouseFilter: string; setWarehouseFilter: (value: string) => void; onValidate: (operation: Operation) => void; onCreate: () => void }) {
  return <section className="data-panel operations-panel"><div className="table-toolbar"><div><span className="section-kicker">STOCK FLOW</span><h2>Recent operations <span className="title-count">{operations.length}</span></h2></div><div className="toolbar-filters"><label className="table-search"><Search size={15} /><input placeholder="Search operations..." value={query} onChange={event => setQuery(event.target.value)} /></label><select className="filter-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filter by operation"><option>All operations</option><option>Receipt</option><option>Delivery</option><option>Transfer</option><option>Adjustment</option></select><select className="filter-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status"><option>All statuses</option><option>Draft</option><option>Waiting</option><option>Ready</option><option>In progress</option><option>Done</option></select><select className="filter-select warehouse-filter" value={warehouseFilter} onChange={event => setWarehouseFilter(event.target.value)} aria-label="Filter by warehouse"><option>All warehouses</option><option>Main warehouse</option><option>North warehouse</option></select></div></div><div className="table-scroll"><table><thead><tr><th>REFERENCE</th><th>OPERATION</th><th>CONTACT / SOURCE</th><th>WAREHOUSE</th><th>ITEMS</th><th>STATUS</th><th>DATE</th><th /></tr></thead><tbody>{operations.map(operation => <tr key={operation.id}><td className="mono ref-cell">{operation.id}</td><td><span className={`type-icon ${operation.type.toLowerCase()}`}>{operation.type === 'Receipt' ? <ArrowDownToLine size={14} /> : operation.type === 'Delivery' ? <Truck size={14} /> : operation.type === 'Transfer' ? <ArrowLeftRight size={14} /> : <Activity size={14} />}</span>{operation.type}</td><td>{operation.partner}</td><td>{operation.warehouse}</td><td>{operation.items} items</td><td><StatusPill status={operation.status} /></td><td className="muted">{operation.date}</td><td>{operation.status !== 'Done' && <button className="validate-btn" title="Validate operation" onClick={() => onValidate(operation)}><Check size={14} /><span>Validate</span></button>}</td></tr>)}</tbody></table></div>{operations.length === 0 && <div className="empty-state"><ClipboardList size={24} /><b>No operations found</b><span>Try another filter or create a new operation.</span></div>}<div className="table-footer"><span>Showing <b>{operations.length ? 1 : 0}–{operations.length}</b> of <b>{operations.length}</b> operations</span><div className="pagination"><button className="icon-btn" disabled aria-label="Previous page"><ChevronLeft size={17} /></button><button className="page-number active">1</button><button className="icon-btn" disabled aria-label="Next page"><ChevronRight size={17} /></button></div><button className="text-link" onClick={onCreate}>View all operations <ArrowUpRight size={14} /></button></div></section>
}

export default App