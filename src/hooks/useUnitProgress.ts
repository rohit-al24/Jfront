const PROGRESS_KEY = 'bengo_unit_progress'

export type UnitProgress = {
  vocabStudied: boolean
  vocabQuizScore: number | null
  grammarLearnPct: number
  grammarQuizDone: boolean
}

const DEFAULT_PROGRESS: UnitProgress = {
  vocabStudied: false,
  vocabQuizScore: null,
  grammarLearnPct: 0,
  grammarQuizDone: false,
}

function readAll(): Record<string, UnitProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getUnitProgress(unitId: string | number): UnitProgress {
  const all = readAll()
  return { ...DEFAULT_PROGRESS, ...(all[String(unitId)] ?? {}) }
}

export function saveUnitProgress(unitId: string | number, patch: Partial<UnitProgress>): void {
  try {
    const all = readAll()
    const key = String(unitId)
    all[key] = { ...DEFAULT_PROGRESS, ...(all[key] ?? {}), ...patch }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {
    // ignore storage errors
  }
}
