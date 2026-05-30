import { Outlet } from 'react-router-dom'
import { PaywallGate } from '../components/PaywallGate'

/**
 * Wrap paid-only routes with this.
 * Free users see the subscription wall; paid users see the page.
 */
export function RequirePaid() {
  return (
    <PaywallGate>
      <Outlet />
    </PaywallGate>
  )
}
