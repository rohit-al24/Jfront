import { AlertTriangle } from 'lucide-react'

export function ExitWarningDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#12101a] p-6 ring-1 ring-orange-500/30 shadow-2xl text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20 ring-1 ring-orange-500/30">
          <AlertTriangle className="h-6 w-6 text-orange-400" />
        </div>
        <h3 className="text-lg font-black text-white">Leave Session?</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          If you go back, your <span className="text-orange-300 font-bold">progress will not be saved</span>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 rounded-xl bg-white/5 py-2.5 text-sm font-bold text-white ring-1 ring-white/10 hover:bg-white/10 transition"
          >
            Keep Going
          </button>
          <button
            onClick={onLeave}
            className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-black text-white hover:bg-orange-500 transition"
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
