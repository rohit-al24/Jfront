import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Trophy, ShoppingBag, User, RotateCcw, Menu, X, LogOut, Flame, NotebookText, ClipboardCheck, GraduationCap, BadgeCheck, Lock, Users, MessageCircle, Settings, Building2, LayoutGrid, BookMarked, UserCheck, UserCog, ClipboardList } from 'lucide-react'

import { useAuth } from '../auth'
import { usePaymentsConfig } from '../paymentsConfig'
import { apiFetch } from '../api'
import { useRoles } from '../hooks/useRoles'

const GATED_PATHS = ['/app/study', '/app/quiz', '/app/review', '/app/course']

type NavItemConfig = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Core nav always shown to every logged-in user
const CORE_NAV: NavItemConfig[] = [
  { to: '/app/learn', label: 'Learn', icon: BookOpen },
  { to: '/app/people', label: 'People', icon: Users },
  { to: '/app/chat', label: 'Messages', icon: MessageCircle },
  { to: '/app/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

// Study/learning pages — grouped under Student section in the sidebar
const STUDENT_LEARNING_NAV: NavItemConfig[] = [
  { to: '/app/study', label: 'Study', icon: NotebookText },
  { to: '/app/quiz', label: 'Quiz', icon: ClipboardCheck },
  { to: '/app/review', label: 'Review', icon: RotateCcw },
  { to: '/app/course', label: 'Course', icon: GraduationCap },
  { to: '/app/leaderboard', label: 'Leaderboard', icon: Trophy },
]

// Role-specific sections shown as a labelled group below CORE_NAV
type RoleSection = { label: string; items: NavItemConfig[] }

function useRoleNav(): RoleSection[] {
  const { roles, loading } = useRoles()
  const sections: RoleSection[] = []

  // While loading, pre-show the Student section so nav doesn't flash empty
  const r = roles ?? []

  if (r.includes('master_admin')) {
    sections.push({
      label: 'Master Admin',
      items: [
        { to: '/app/master/colleges', label: 'Colleges', icon: Building2 },
      ],
    })
  }

  if (r.includes('college_admin')) {
    sections.push({
      label: 'College Admin',
      items: [
        { to: '/app/college/departments', label: 'Departments', icon: LayoutGrid },
        { to: '/app/college/sensei', label: 'Sensei', icon: BookMarked },
        { to: '/app/college/classes', label: 'Classes', icon: BookOpen },
        { to: '/app/college/students', label: 'Students', icon: Users },
        { to: '/app/college/requests', label: 'Requests', icon: ClipboardList },
      ],
    })
  }

  if (r.includes('sensei')) {
    sections.push({
      label: 'Sensei',
      items: [
        { to: '/app/college/students', label: 'Students', icon: Users },
        { to: '/app/staff/mentees', label: 'Mentees', icon: UserCheck },
      ],
    })
  }

  if (r.includes('staff') && !r.includes('sensei') && !r.includes('college_admin')) {
    sections.push({
      label: 'Staff',
      items: [
        { to: '/app/staff/mentees', label: 'My Mentees', icon: UserCheck },
      ],
    })
  }

  // Student section — always shown (admin roles also get it while loading resolves;
  // once loaded, shown only to non-pure-admin users)
  const isAdminRole = !loading && r.some(role => ['master_admin', 'college_admin', 'sensei'].includes(role))
  if (!isAdminRole) {
    sections.push({
      label: 'Student',
      items: [
        ...STUDENT_LEARNING_NAV,
        ...(r.includes('student') ? [{ to: '/app/student/mentor', label: 'My Mentor', icon: UserCog }] : []),
      ],
    })
  }

  return sections
}

function DesktopNavItem({ to, label, icon: Icon, collapsed, locked, badge }: NavItemConfig & { collapsed?: boolean; locked?: boolean; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          collapsed
            ? 'group relative flex items-center justify-center px-0 py-3 text-base md:text-lg font-semibold transition-all duration-200'
            : 'group relative flex items-center gap-4 px-6 py-4 text-base md:text-lg font-semibold transition-all duration-200',
          isActive
            ? 'bg-red-600/25 text-gold-300 shadow-[0_6px_30px_rgba(220,38,38,0.35)]'
            : 'text-white/70 hover:bg-white/5 hover:text-white/95',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <div className="absolute left-0 top-0 h-full w-2 rounded-tr-md rounded-br-md bg-gold-500" />}
          <div className="relative">
            <Icon className={collapsed ? 'h-6 w-6' : 'h-6 w-6 md:h-7 md:w-7'} />
            {badge != null && badge > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[9px] font-black text-white">{badge}</span>
            )}
          </div>
          {!collapsed && (
            <span className="flex-1">{label}</span>
          )}
          {locked && !collapsed && (
            <Lock className="h-3.5 w-3.5 text-white/30" />
          )}
        </>
      )}
    </NavLink>
  )
}

function MobileNavItem({ to, icon: Icon }: NavItemConfig) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <NavLink
      to={to}
      className={[
        'flex flex-col items-center justify-center gap-1 py-2',
        isActive ? 'text-gold-400' : 'text-white/60',
      ].join(' ')}
    >
      <Icon className="h-5 w-5" />
    </NavLink>
  )
}

// Animated bento-dot sidebar toggle — 4 squares pulse with stagger, no arrows/lines
function BentoDots({ collapsed }: { collapsed: boolean }) {
  // d0..d3 animate in sequence; when collapsed, d3 fades out to hint 'open'
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="2"
        style={{ animation: 'dotPulse 1.6s ease-in-out 0s infinite' }} />
      <rect x="12" y="2" width="8" height="8" rx="2"
        style={{ animation: 'dotPulse 1.6s ease-in-out 0.25s infinite' }} />
      <rect x="2" y="12" width="8" height="8" rx="2"
        style={{ animation: 'dotPulse 1.6s ease-in-out 0.5s infinite' }} />
      <rect x="12" y="12" width="8" height="8" rx="2"
        style={{
          animation: 'dotPulse 1.6s ease-in-out 0.75s infinite',
          opacity: collapsed ? 0.25 : 1,
          transition: 'opacity 0.3s',
        }} />
    </svg>
  )
}

export function SidebarLayout({
  topbar,
}: {
  header?: React.ReactNode
  topbar: React.ReactNode
}) {
  const { state, logout } = useAuth()
  const { enabled: paymentsEnabled, loading: paymentsLoading } = usePaymentsConfig()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [requestsBadge, setRequestsBadge] = useState(0)
  const roleSections = useRoleNav()

  useEffect(() => {
    apiFetch<{ requests: { id: number }[] }>('/api/social/requests/incoming/')
      .then((r) => setRequestsBadge(r.requests?.length ?? 0))
      .catch(() => null)
    const t = setInterval(() => {
      apiFetch<{ requests: { id: number }[] }>('/api/social/requests/incoming/')
        .then((r) => setRequestsBadge(r.requests?.length ?? 0))
        .catch(() => null)
    }, 60000)
    return () => clearInterval(t)
  }, [])

  async function onLogout() {
    await logout()
    navigate('/login')
  }

  const userEmail = state?.user?.username || 'user@nihongo.lms'
  const isPaid = state?.user?.subscription_status === 'paid'
  const showPaymentsUi = !paymentsLoading && paymentsEnabled

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0D0D0D] text-white">
      {/* CSS Background — deep purple/black gradient with ambient glow orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#080810]" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 20% 30%, rgba(80,0,160,0.18) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 70%, rgba(150,20,20,0.13) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 10%, rgba(40,0,80,0.22) 0%, transparent 70%)' }} />
      </div>

      {/* Global Header - Fixed */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#0D0D0D]/95 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-4 md:px-8">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {/* Desktop collapse/expand */}
            <button
              onClick={() => setCollapsed((s) => !s)}
              className="hidden items-center justify-center rounded-xl bg-white/8 p-2.5 text-white shadow-inner ring-1 ring-white/10 transition-all duration-150 hover:bg-white/14 hover:ring-white/20 active:scale-95 md:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <BentoDots collapsed={collapsed} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-xl font-black italic tracking-tight md:text-3xl flex items-baseline gap-1">
                <span
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #000000 0%, #330000 20%, #800000 40%, #B30000 60%, #E60000 80%, #FFFFFF 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Ben
                </span>
                <span
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #3D2D0B 0%, #6B4E16 15%, #9C7A28 30%, #CFB04C 45%, #FFFFFF 50%, #CFB04C 55%, #9C7A28 70%, #6B4E16 85%, #3D2D0B 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Go
                </span>
              </div>
            </div>
          </div>

          {/* Right: User Email + Sub status + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <div className="text-base font-medium text-gold-400">{userEmail}</div>
              {showPaymentsUi && (
                isPaid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2 py-0.5 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                    <BadgeCheck className="h-3 w-3" /> PRO
                  </span>
                ) : (
                  <NavLink
                    to="/app/shop"
                    className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-400 ring-1 ring-yellow-500/20 hover:bg-yellow-500/20 transition"
                  >
                    FREE
                  </NavLink>
                )
              )}
            </div>
            <button
              onClick={onLogout}
              className="group flex items-center gap-3 rounded-lg bg-white/5 px-4 py-2 text-base font-semibold transition-all hover:bg-red-600 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar - Fixed */}
      <aside className={`fixed left-0 top-20 hidden h-[calc(100vh-5rem)] ${collapsed ? 'w-20' : 'w-72'} flex-col border-r border-white/10 bg-[#0D0D0D]/95 backdrop-blur-xl md:flex overflow-hidden`}>
        {/* Navigation Items - scrollable */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 space-y-1 px-3 sidebar-scroll">
          {CORE_NAV
            .filter((item) => showPaymentsUi || item.to !== '/app/shop')
            .map((item) => (
            <DesktopNavItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              locked={showPaymentsUi && !isPaid && GATED_PATHS.some((p) => item.to.startsWith(p))}
              badge={item.to === '/app/people' ? requestsBadge : undefined}
            />
          ))}

          {/* Role-based sections */}
          {roleSections.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25 select-none">
                  {section.label}
                </div>
              )}
              {collapsed && <div className="my-2 mx-3 h-px bg-white/10" />}
              {section.items.map(item => (
                <DesktopNavItem
                  key={item.to}
                  {...item}
                  collapsed={collapsed}
                  locked={showPaymentsUi && !isPaid && GATED_PATHS.some(p => item.to.startsWith(p))}
                  badge={item.to === '/app/people' ? requestsBadge : undefined}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Pinned footer: subscription badge + streak */}
        <div className="shrink-0 border-t border-white/10">
          {/* Subscription badge */}
          {!collapsed && showPaymentsUi && (
            <div className="px-4 pt-3 pb-2">
              {isPaid ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-600/10 px-3 py-2 ring-1 ring-emerald-500/20">
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">PRO · Active</span>
                </div>
              ) : (
                <NavLink
                  to="/app/shop"
                  className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-3 py-2 ring-1 ring-yellow-500/20 hover:bg-yellow-500/20 transition"
                >
                  <ShoppingBag className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">FREE · Upgrade ₹2/mo</span>
                </NavLink>
              )}
            </div>
          )}

          {/* Streak Widget */}
          <div className="p-3">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl bg-gradient-to-br from-red-600/20 to-gold-500/20 p-3 shadow-[0_4px_20px_rgba(220,38,38,0.18)]`}>
              <Flame className="h-7 w-7 shrink-0 text-gold-500" />
              {!collapsed && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Streak</div>
                  <div className="text-xl font-black italic text-gold-400">{state?.user?.streak_count ?? 0} DAYS</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-over Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-[#0D0D0D]/98 backdrop-blur-xl overflow-hidden">
            {/* Drawer Header */}
            <div className="flex shrink-0 h-16 items-center justify-between border-b border-white/10 px-4">
              <div className="text-xl font-black italic flex items-baseline gap-1">
                <span
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #000000 0%, #330000 20%, #800000 40%, #B30000 60%, #E60000 80%, #FFFFFF 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Ben
                </span>
                <span
                  style={{
                    backgroundImage: 'linear-gradient(180deg, #3D2D0B 0%, #6B4E16 15%, #9C7A28 30%, #CFB04C 45%, #FFFFFF 50%, #CFB04C 55%, #9C7A28 70%, #6B4E16 85%, #3D2D0B 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Go
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Drawer Navigation - scrollable */}
            <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 sidebar-scroll">
              {CORE_NAV
                .filter((item) => showPaymentsUi || item.to !== '/app/shop')
                .map((item) => (
                <div key={item.to} onClick={() => setSidebarOpen(false)}>
                  <DesktopNavItem
                    {...item}
                    locked={showPaymentsUi && !isPaid && GATED_PATHS.some((p) => item.to.startsWith(p))}
                    badge={item.to === '/app/people' ? requestsBadge : undefined}
                  />
                </div>
              ))}

              {/* Role-based sections (mobile) */}
              {roleSections.map(section => (
                <div key={section.label}>
                  <div className="px-6 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25 select-none">
                    {section.label}
                  </div>
                  {section.items.map(item => (
                    <div key={item.to} onClick={() => setSidebarOpen(false)}>
                      <DesktopNavItem
                        {...item}
                        locked={showPaymentsUi && !isPaid && GATED_PATHS.some(p => item.to.startsWith(p))}
                        badge={item.to === '/app/people' ? requestsBadge : undefined}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </nav>

            {/* Pinned footer */}
            <div className="shrink-0 border-t border-white/10">
              {/* Signed-in info + sub badge */}
              <div className="px-4 pt-3 pb-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Signed in as</div>
                <div className="mt-0.5 text-sm font-medium text-gold-400 truncate">{userEmail}</div>
                {showPaymentsUi && (
                  <div className="mt-2">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                        <BadgeCheck className="h-3.5 w-3.5" /> PRO
                      </span>
                    ) : (
                      <NavLink
                        to="/app/shop"
                        onClick={() => setSidebarOpen(false)}
                        className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400 ring-1 ring-yellow-500/20"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> FREE · Upgrade
                      </NavLink>
                    )}
                  </div>
                )}
              </div>

              {/* Streak Widget */}
              <div className="p-3">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-red-600/20 to-gold-500/20 p-3">
                  <Flame className="h-7 w-7 text-gold-500" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Streak</div>
                    <div className="text-xl font-black italic text-gold-400">{state?.user?.streak_count ?? 0} DAYS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`relative z-10 ${collapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <div className="min-h-screen pt-20">
          {/* Top Bar */}
          <div className="sticky top-20 z-40 border-b border-white/10 bg-[#0D0D0D]/90 backdrop-blur-xl">
            <div className="px-4 py-4 md:px-6">{topbar}</div>
          </div>

          {/* Page Content */}
          <div className="p-4 pb-24 md:p-6 md:pb-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0D0D0D]/98 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-3">
          {CORE_NAV.slice(0, 3).map((item) => (
            <MobileNavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  )
}
