'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, FileText, Building2, Package, DollarSign, CreditCard, Box } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Search function with debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  const handleResultClick = (type: string, id: string) => {
    const routes: Record<string, string> = {
      orders: `/orders/${id}`,
      projects: `/projects/${id}`,
      deliveries: `/deliveries/${id}`,
      expenses: `/expenses/${id}`,
      payments: `/payments/${id}`,
      products: `/products/${id}`
    }
    
    router.push(routes[type] || '/')
    setIsOpen(false)
    setQuery('')
  }

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      orders: FileText,
      projects: Building2,
      deliveries: Package,
      expenses: DollarSign,
      payments: CreditCard,
      products: Box
    }
    const Icon = icons[type] || FileText
    return <Icon className="w-4 h-4" />
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      orders: 'Orders',
      projects: 'Projects',
      deliveries: 'Deliveries',
      expenses: 'Expenses',
      payments: 'Payments',
      products: 'Products'
    }
    return labels[type] || type
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Search (Cmd+K)"
      >
        <Search className="w-5 h-5" />
        <span className="hidden md:inline text-sm">Search</span>
        <kbd className="hidden md:inline px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, projects, expenses..."
            className="flex-1 text-lg outline-none"
          />
          {loading && (
            <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-2">Search across orders, projects, deliveries, expenses, payments, and products</p>
            </div>
          )}

          {query.length >= 2 && results && results.total === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-900">No results found for "{query}"</p>
              <p className="text-sm mt-2">Try searching for:</p>
              <ul className="text-sm mt-3 space-y-1 text-gray-600">
                <li>• Order numbers or vendors</li>
                <li>• Project names or addresses</li>
                <li>• Product SKUs or names</li>
                <li>• Expense categories</li>
              </ul>
              <p className="text-xs mt-4 text-gray-400">
                Tip: Make sure you have data in your database first
              </p>
            </div>
          )}

          {results && results.total > 0 && (
            <div className="py-2">
              {Object.entries(results.results).map(([type, items]: [string, any]) => {
                if (!items || items.length === 0) return null

                return (
                  <div key={type} className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                      {getTypeLabel(type)} ({items.length})
                    </div>
                    {items.map((item: any) => (
                      <button
                        key={item.id}
                        onClick={() => handleResultClick(type, item.id)}
                        className="w-full px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-left transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-gray-400">
                            {getIcon(type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {type === 'orders' && (item.description || item.vendor || 'Order')}
                              {type === 'projects' && (item.name || item.code)}
                              {type === 'deliveries' && item.delivery_number}
                              {type === 'expenses' && item.vendor}
                              {type === 'payments' && item.vendor}
                              {type === 'products' && item.name}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {type === 'orders' && (item.vendor || item.product_name || item.category)}
                              {type === 'projects' && (item.code || `Budget: $${parseFloat(item.budget || 0).toLocaleString()}`)}
                              {type === 'deliveries' && item.purchase_orders?.projects?.name}
                              {type === 'expenses' && item.description}
                              {type === 'payments' && `${item.payment_method || 'Payment'} - ${item.reference_number || 'N/A'}`}
                              {type === 'products' && (item.sku || item.category)}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {item.amount && (
                                <span className="text-sm font-semibold text-green-600">
                                  ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              )}
                              {item.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.status === 'approved' || item.status === 'paid' || item.status === 'delivered' 
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'pending' || item.status === 'in-transit'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded">ESC</kbd> to close</span>
          </div>
          <div>
            {results && results.total > 0 && (
              <span>{results.total} result{results.total !== 1 ? 's' : ''} found</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
