import { useEffect, useState } from 'react'
import { Lightbulb, Bell, Shield, ChevronRight, Loader2 } from 'lucide-react'
import { apiFetch } from '../../api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserSettingsData {
  hints_visible_to_friends: boolean
}

// ─── Toggle row component ─────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{label}</div>
        {description && (
          <div className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => !disabled && onChange(!value)}
        className={[
          'relative inline-flex h-7 w-12 flex-none cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
          value ? 'bg-violet-600' : 'bg-white/15',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            value ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function SettingsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/4">
      {/* Section header */}
      <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/8">
          <Icon className="h-4 w-4 text-white/70" />
        </div>
        <span className="text-xs font-black uppercase tracking-[0.18em] text-white/50">{title}</span>
      </div>
      {/* Rows */}
      <div className="divide-y divide-white/6 px-4">
        {children}
      </div>
    </div>
  )
}

// ─── Nav-style link row ───────────────────────────────────────────────────────

function LinkRow({ label, description, onClick }: { label: string; description?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:bg-white/3 -mx-4 px-4"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{label}</div>
        {description && <div className="mt-0.5 text-xs text-white/45">{description}</div>}
      </div>
      <ChevronRight className="h-4 w-4 flex-none text-white/30" />
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettingsData>({
    hints_visible_to_friends: true,
  })

  useEffect(() => {
    apiFetch<UserSettingsData>('/api/social/settings/')
      .then((d) => setSettings(d))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  async function patch(update: Partial<UserSettingsData>) {
    const next = { ...settings, ...update }
    setSettings(next)          // optimistic
    setSaving(true)
    try {
      const saved = await apiFetch<UserSettingsData>('/api/social/settings/', {
        method: 'POST',
        json: update,
      })
      setSettings(saved)
    } catch {
      setSettings(settings)    // rollback on error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="mt-0.5 text-sm text-white/45">Manage your preferences</p>
        </div>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>

      {/* ── Section 1: Hints ─────────────────────────────────────────────── */}
      <SettingsSection icon={Lightbulb} title="Hints">
        <ToggleRow
          label="Show hints to friends"
          description="Let your friends see the hints you've written for vocabulary words."
          value={settings.hints_visible_to_friends}
          onChange={(v) => patch({ hints_visible_to_friends: v })}
          disabled={saving}
        />
      </SettingsSection>

      {/* ── Section 2: Notifications ─────────────────────────────────────── */}
      <SettingsSection icon={Bell} title="Notifications">
        <ToggleRow
          label="Study reminders"
          description="Daily reminder to keep your streak alive."
          value={false}
          onChange={() => null}
          disabled
        />
        <ToggleRow
          label="Friend activity"
          description="Notify when friends send you a message or hint."
          value={false}
          onChange={() => null}
          disabled
        />
        <div className="py-3 text-[11px] text-white/25 italic">Push notifications — coming soon</div>
      </SettingsSection>

      {/* ── Section 3: Account ───────────────────────────────────────────── */}
      <SettingsSection icon={Shield} title="Account">
        <LinkRow
          label="Edit profile"
          description="Change your name, username, and photo."
          onClick={() => window.location.href = '/app/profile'}
        />
        <LinkRow
          label="Privacy"
          description="Control who can see your profile and activity."
        />
        <LinkRow
          label="Delete account"
          description="Permanently remove your account and data."
        />
      </SettingsSection>

      <div className="text-center text-[11px] text-white/20">BenGo · v1.0</div>
    </div>
  )
}
