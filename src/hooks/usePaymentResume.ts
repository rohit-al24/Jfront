/**
 * usePaymentResume
 *
 * Two-pronged detection for post-Cashfree-payment return:
 *   1. Web / browser:  URL already contains ?result=1&order_id= (handled by Shop.tsx)
 *   2. Android native: App goes to background (external Cashfree browser) then comes
 *      back to foreground. We stored {order_id} in localStorage before redirecting, so
 *      on every "app became active" event we check and verify.
 *
 * Usage: call once in App.tsx (top-level, always mounted).
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

import { apiFetch } from '../api'
import { useAuth } from '../auth'

const STORAGE_KEY = 'pendingCashfreeOrder'

export interface PendingOrder {
  order_id: string
  initiated_at: number  // Date.now()
}

/** Call before window.location.href = payment_link */
export function savePendingOrder(order_id: string) {
  const data: PendingOrder = { order_id, initiated_at: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearPendingOrder() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getPendingOrder(): PendingOrder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p: PendingOrder = JSON.parse(raw)
    // Expire after 1 hour to avoid stale checks
    if (Date.now() - p.initiated_at > 3_600_000) {
      clearPendingOrder()
      return null
    }
    return p
  } catch {
    return null
  }
}

export function usePaymentResume() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  async function verifyPending() {
    const pending = getPendingOrder()
    if (!pending) return

    try {
      const res = await apiFetch<{ paid: boolean }>(
        `/api/billing/cashfree-verify/?order_id=${pending.order_id}`,
      )
      if (res.paid) {
        clearPendingOrder()
        await refresh()
        navigate('/app/learn?subscribed=1', { replace: true })
      }
      // If not paid yet, leave pending in storage for next resume
    } catch {
      // Network error – leave pending, try again next time
    }
  }

  useEffect(() => {
    // Android native: listen for app coming back to foreground
    if (Capacitor.isNativePlatform()) {
      let listenerHandle: { remove: () => void } | null = null
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) verifyPending()
      }).then((h) => { listenerHandle = h })

      return () => { listenerHandle?.remove() }
    }
    // Web: nothing needed here – Shop.tsx handles the URL params
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
}
