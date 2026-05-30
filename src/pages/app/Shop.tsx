import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShoppingBag, Zap, Users, Loader2, BadgeCheck } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

import { apiFetch } from '../../api'
import { useAuth } from '../../auth'
import { usePaymentsConfig } from '../../paymentsConfig'
import { savePendingOrder } from '../../hooks/usePaymentResume'

// Cashfree requires HTTPS for all return URLs.
// In production the origin is already https://jback.zynix.us.
// In local dev the origin is http://localhost:5173 (rejected by Cashfree),
// so we fall back to the production URL instead.
// On Android native, the Capacitor WebView origin is http://localhost, which
// Cashfree also rejects; use the production URL and rely on the appStateChange
// listener (usePaymentResume) to detect the return to the app.
const PROD_ORIGIN = 'https://jback.zynix.us'

function getReturnUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${PROD_ORIGIN}/app/shop?result=1`
  }
  const origin = window.location.origin
  const safeOrigin = origin.startsWith('https://') ? origin : PROD_ORIGIN
  return `${safeOrigin}/app/shop?result=1`
}

const PLAN_FEATURES = [
  'Full video lesson access',
  'Daily adaptive quiz (Pakka system)',
  'Spaced-repetition & flip-mode review',
  'Grammar deep-dives per unit',
  'Certificate download',
  'Leaderboard ranking',
]

export function Shop() {
  const { state, refresh } = useAuth()
  const { enabled: paymentsEnabled, loading: paymentsLoading } = usePaymentsConfig()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResult, setPaymentResult] = useState<'success' | 'pending' | null>(null)

  const isPaid = state?.user?.subscription_status === 'paid'

  // If payments are globally disabled, do not attempt to verify or show checkout.
  const showPaymentsUi = !paymentsLoading && paymentsEnabled

  // ── Handle return from Cashfree ────────────────────────────────────────────
  useEffect(() => {
    if (!showPaymentsUi) return
    const result  = searchParams.get('result')
    const orderId = searchParams.get('order_id')
    if (!result || !orderId) return

    setVerifying(true)
    apiFetch<{ paid: boolean; order_status: string }>(
      `/api/billing/cashfree-verify/?order_id=${orderId}`,
    )
      .then(async (res) => {
        if (res.paid) {
          await refresh()    // update subscription_status in auth context
          // Redirect to dashboard with celebration flag
          navigate('/app/learn?subscribed=1', { replace: true })
        } else {
          setPaymentResult('pending')
        }
      })
      .catch(() => setPaymentResult('pending'))
      .finally(() => setVerifying(false))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function subscribe() {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch<{ payment_link?: string; order_id?: string; detail?: string }>(
        '/api/billing/cashfree-order/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: 1, return_url: getReturnUrl() }),
        },
      )
      if (res.payment_link) {
        if (res.order_id) savePendingOrder(res.order_id)   // ← persist for Android resume
        window.location.href = res.payment_link
      } else {
        setError(res.detail ?? 'Payment gateway not configured yet. Contact support.')
      }
    } catch (e: any) {
      setError(e?.message ?? 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1a0a] to-[#0d0d0d] p-6 ring-1 ring-yellow-500/20 md:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-yellow-500">
            <ShoppingBag className="h-4 w-4" /> Subscription
          </div>
          <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">Unlock Your Dojo</h2>
          <p className="mt-1 text-base text-white/40">One plan. Full access. Cancel anytime.</p>
        </div>
      </div>

      {/* Payment result banner */}
      {verifying && (
        <div className="flex items-center gap-3 rounded-2xl bg-yellow-900/20 px-5 py-4 ring-1 ring-yellow-500/30">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-300">Verifying your payment…</span>
        </div>
      )}
      {paymentResult === 'pending' && (
        <div className="rounded-2xl bg-yellow-900/20 px-5 py-4 ring-1 ring-yellow-500/30 text-sm text-yellow-300">
          Payment is being processed. Please wait a few minutes and refresh the page.
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-950/60 px-5 py-4 text-sm font-medium text-red-300 ring-1 ring-red-500/30">
          {error}
        </div>
      )}

      {!showPaymentsUi && (
        <div className="rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10">
          <p className="text-lg font-black text-white">Subscriptions are disabled</p>
          <p className="mt-1 text-sm text-white/50">All features are unlocked in the free version.</p>
        </div>
      )}

      {/* Already subscribed */}
      {showPaymentsUi && (isPaid ? (
        <div className="flex items-center gap-4 rounded-2xl bg-emerald-900/20 p-6 ring-1 ring-emerald-500/30">
          <BadgeCheck className="h-10 w-10 flex-none text-emerald-400" />
          <div>
            <p className="text-lg font-black text-white">You're a Pro member 🎉</p>
            <p className="mt-0.5 text-sm text-white/50">Full access is active on your account.</p>
          </div>
        </div>
      ) : (
        /* ₹50 Plan card */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 p-6 ring-1 ring-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)] md:p-8">
          <div className="absolute right-4 top-4 rounded-full bg-yellow-500 px-2.5 py-1 text-xs font-black text-black">
            ONLY PLAN
          </div>

          {/* Price */}
          <div className="mb-1">
            <span className="text-5xl font-black text-yellow-400">₹2</span>
            <span className="ml-2 text-sm text-white/40">/ month</span>
          </div>
          <p className="mb-5 text-sm text-white/40">30-day access · Powered by Cashfree</p>

          {/* Features */}
          <ul className="mb-6 space-y-2">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="h-4 w-4 flex-none text-yellow-500" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={subscribe}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-4 text-lg font-black text-black shadow-[0_0_24px_rgba(234,179,8,0.45)] transition hover:bg-yellow-400 active:scale-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            {loading ? 'Redirecting…' : 'Subscribe for ₹2/month (Test)'}
          </button>

          <p className="mt-3 text-center text-xs text-white/25">
            Secured by Cashfree · UPI, Cards, Net Banking accepted
          </p>
        </div>
      ))}

      {/* Referral Banner */}
      <div className="flex items-center gap-4 rounded-2xl bg-white/[0.03] p-6 ring-1 ring-white/10 md:gap-6">
        <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-purple-600/20">
          <Users className="h-7 w-7 text-purple-400" />
        </div>
        <div>
          <div className="text-base font-bold text-white">Refer & Earn</div>
          <p className="mt-0.5 text-sm text-white/40">Share your referral code with friends.</p>
        </div>
      </div>
    </div>
  )
}
