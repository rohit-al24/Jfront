/**
 * PaywallGate
 * Wrap any page component with this to require an active subscription.
 * Free users see a subscribe page inline (sidebar stays visible).
 * Paid users see the actual page content.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Lock, CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

import { apiFetch } from '../api'
import { useAuth } from '../auth'
import { savePendingOrder } from '../hooks/usePaymentResume'
import { usePaymentsConfig } from '../paymentsConfig'

const PROD_ORIGIN = 'https://jback.zynix.us'

function getReturnUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${PROD_ORIGIN}/app/shop?result=1`
  }
  const origin = window.location.origin
  const safeOrigin = origin.startsWith('https://') ? origin : PROD_ORIGIN
  return `${safeOrigin}/app/shop?result=1`
}

const PLAN = {
  id: 1,
  display_name: 'Monthly Plan',
  price: '₹2',
  duration: '30 days',
  features: [
    'Full video lesson access',
    'Daily adaptive quiz (Pakka)',
    'Spaced-repetition review',
    'Grammar deep-dives',
    'Certificate download',
    'Leaderboard ranking',
  ],
}

function SubscribeWall() {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const navigate = useNavigate()

  async function subscribe() {
    setErr(null)
    setLoading(true)
    try {
      const res = await apiFetch<{
        payment_link?: string
        order_id?: string
        detail?: string
      }>('/api/billing/cashfree-order/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: 1, return_url: getReturnUrl() }),
      })

      if (res.payment_link) {
        if (res.order_id) savePendingOrder(res.order_id)   // ← persist for Android resume
        window.location.href = res.payment_link
      } else {
        // Cashfree not yet configured — show Shop page for manual usage
        setErr(res.detail ?? 'Payment gateway not configured. Please contact support.')
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Lock icon header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-500/10 ring-1 ring-yellow-500/20">
            <Lock className="h-10 w-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Unlock Full Access</h2>
          <p className="mt-2 text-sm text-white/50">Subscribe to access this feature</p>
        </div>

        {/* Plan card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 p-6 ring-1 ring-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.12)]">
          <div className="absolute right-4 top-4 rounded-full bg-yellow-500 px-2.5 py-1 text-xs font-black text-black">
            BEST VALUE
          </div>

          {/* Price */}
          <div className="mb-4">
            <span className="text-4xl font-black text-yellow-400">{PLAN.price}</span>
            <span className="ml-1 text-sm text-white/40">/ month</span>
          </div>

          <p className="mb-4 text-sm text-white/50">{PLAN.duration} access · cancel anytime</p>

          {/* Features */}
          <ul className="mb-6 space-y-2">
            {PLAN.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle className="h-4 w-4 flex-none text-yellow-500" />
                {f}
              </li>
            ))}
          </ul>

          {/* Subscribe button */}
          <button
            onClick={subscribe}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3.5 text-base font-black text-black shadow-[0_0_20px_rgba(234,179,8,0.4)] transition hover:bg-yellow-400 active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Zap className="h-5 w-5" />
            )}
            {loading ? 'Redirecting to payment…' : `Subscribe for ${PLAN.price}/month (Test)`}
          </button>

          {err && (
            <p className="mt-3 rounded-lg bg-red-900/30 px-3 py-2 text-center text-xs text-red-300 ring-1 ring-red-700/40">
              {err}
            </p>
          )}
        </div>

        {/* Go to shop link */}
        <button
          onClick={() => navigate('/app/shop')}
          className="mt-4 flex w-full items-center justify-center gap-1 text-xs text-white/30 hover:text-white/60 transition"
        >
          View subscription details <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

interface PaywallGateProps {
  children: React.ReactNode
}

export function PaywallGate({ children }: PaywallGateProps) {
  const { state } = useAuth()
  const { enabled: paymentsEnabled, loading: paymentsLoading } = usePaymentsConfig()

  // Loading
  if (state === null) return null

  // While the master payments flag is loading, avoid showing locks/paywall.
  // Once loaded, the backend flag decides whether the app is paywalled.
  if (paymentsLoading) return <>{children}</>

  // Master switch OFF => everything unlocked (no paywall)
  if (!paymentsEnabled) return <>{children}</>

  const isPaid = state.user?.subscription_status === 'paid'
  if (isPaid) return <>{children}</>

  return <SubscribeWall />
}
