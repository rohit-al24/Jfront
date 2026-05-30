import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { apiFetch } from './api'

type PaymentsConfig = {
  enabled: boolean
  loading: boolean
  refresh: () => Promise<void>
}

const PaymentsContext = createContext<PaymentsConfig | null>(null)

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  // Default to true (secure): if fetch fails, paywall remains ON.
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const res = await apiFetch<{ enabled: boolean }>('/api/payments/master/')
      setEnabled(Boolean(res.enabled))
    } catch {
      // Fail-closed: keep enabled=true
      setEnabled(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const value = useMemo(() => ({ enabled, loading, refresh }), [enabled, loading])
  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>
}

export function usePaymentsConfig() {
  const ctx = useContext(PaymentsContext)
  if (!ctx) throw new Error('usePaymentsConfig must be used within PaymentsProvider')
  return ctx
}
