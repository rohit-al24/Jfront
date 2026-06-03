import { useEffect, useState } from 'react'
import { apiFetch } from '../api'

export type CollegeAdminOf = {
  id: number
  name: string
  code: string
}

export type RolesData = {
  roles: string[]
  college_admin_of: CollegeAdminOf[]
}

export function useRoles() {
  const [data, setData] = useState<RolesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<RolesData>('/api/admin/me/roles/')
      .then(setData)
      .catch(() => setData({ roles: [], college_admin_of: [] }))
      .finally(() => setLoading(false))
  }, [])

  const isRole = (...roleNames: string[]) =>
    !!data && roleNames.some(r => data.roles.includes(r))

  return { ...data, loading, isRole }
}
