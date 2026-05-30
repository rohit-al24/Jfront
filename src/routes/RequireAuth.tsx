import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth'

export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state === null) {
    return (
      <div className="min-h-screen bg-bg text-text">
        <div className="mx-auto max-w-md px-5 py-16 text-sm text-muted">Loading…</div>
      </div>
    )
  }

  if (!state.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
