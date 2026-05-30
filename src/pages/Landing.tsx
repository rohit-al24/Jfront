import { useState } from 'react'
import { Link } from 'react-router-dom'

import { MobileWelcome } from '../components/MobileWelcome'
import backgroundVideo from '../assets/background.mp4'

export function Landing() {
  const [targetLevel, setTargetLevel] = useState<'N5' | 'N4'>('N5')
  const [bgReady, setBgReady] = useState(false)

  return (
    <>
      {/* Mobile layout — rendered below md breakpoint */}
      <div className="md:hidden">
        <MobileWelcome />
      </div>

      {/* Desktop layout — rendered at md and above */}
      <div className="hidden min-h-screen bg-[#0a0a0a] font-sans text-white selection:bg-red-600 md:block">
      {/* --- FIXED NAVBAR --- */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-white/5 bg-black/40 px-10 py-5 backdrop-blur-xl">
        <div className="text-2xl font-black uppercase tracking-tighter flex items-baseline gap-1">
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
        <div className="flex gap-4">
          <Link
            to="/register"
            className="rounded bg-red-600 px-6 py-1.5 text-sm font-bold transition-all hover:bg-red-700 active:scale-95"
          >
            Sign Up
          </Link>
          <Link
            to="/login"
            className="rounded border border-white/20 bg-transparent px-6 py-1.5 text-sm font-bold transition-all hover:bg-white/5"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION (Swiggy Style Split) --- */}
      <section className="relative flex h-screen flex-col items-center overflow-hidden md:flex-row">
        {/* Video Background Layer — fills entire hero */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black" />
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setBgReady(true)}
            className={['h-full w-full object-cover transition-opacity duration-300', bgReady ? 'opacity-70' : 'opacity-0'].join(' ')}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
          {/* Dark overlay for text contrast (30% black tint) */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Left Side: Content */}
        <div className="relative z-10 px-12 pt-20 md:w-1/2">
          <h1 className="mb-6 text-7xl font-black italic leading-none">
            Benkyou  <br />
            <span className="text-red-600">Nihongo</span>
          </h1>
          <p className="mb-8 max-w-md text-lg text-gray-400">
            The only JLPT N5/N4 platform that turns your mistakes into your greatest strengths through automated memory
            loops.
          </p>

          {/* Target Selector Bar */}
          <div className="flex max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl shadow-red-900/20">
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as 'N5' | 'N4')}
              className="flex-grow border-r border-gray-200 bg-white p-5 font-bold text-black outline-none"
            >
              <option value="N5">Set Your Goal: JLPT N5</option>
              <option value="N4">Set Your Goal: JLPT N4</option>
            </select>
            <Link
              to={`/register?target=${targetLevel}`}
              className="bg-red-600 px-10 font-black uppercase tracking-tighter text-white transition-colors hover:bg-black"
            >
              Start Learning
            </Link>
          </div>

          <div className="mt-10 flex gap-6 text-xs font-bold uppercase tracking-widest text-yellow-500">
            <span>₹200 / Month</span>
            <span className="text-gray-600">|</span>
            <span>Earn Certification</span>
          </div>
        </div>

        {/* Additional gradient overlay for better text readability on left side */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </section>

      {/* --- DASHBOARD PREVIEW --- */}
      <section className="relative z-10 bg-gradient-to-b from-transparent to-black px-10 py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {/* Daily Quiz Card */}
          <div className="group rounded-3xl border border-gray-800 bg-[#111] p-8 transition-all hover:border-red-600/50">
            <h3 className="mb-4 text-xl font-bold text-yellow-500">Daily Quiz</h3>
            <p className="mb-8 text-sm leading-relaxed text-gray-400">
              Fetches <span className="font-bold text-white">new questions</span> + mixes in your review queue for
              maximum retention.
            </p>
            <button className="w-full rounded-xl bg-red-600 py-3 font-black text-white transition-transform group-hover:scale-105">
              Start
            </button>
          </div>

          {/* Saturday Video Card */}
          <div className="group rounded-3xl border border-gray-800 bg-[#111] p-8 transition-all hover:border-yellow-600/50">
            <h3 className="mb-4 text-xl font-bold text-yellow-500">Saturday Video</h3>
            <p className="mb-8 text-sm leading-relaxed text-gray-400">
              Unlocks only on <span className="font-bold text-white">Saturday</span> for paid users. Video completion
              awards bonus points.
            </p>
            <button className="w-full rounded-xl border border-gray-700 py-3 font-black text-gray-300 transition-all group-hover:bg-white group-hover:text-black">
              Open Player
            </button>
          </div>

          {/* Certificate Card */}
          <div className="group rounded-3xl border border-gray-800 bg-[#111] p-8 transition-all hover:border-yellow-400/50">
            <h3 className="mb-4 text-xl font-bold text-yellow-500">Certificate</h3>
            <p className="mb-8 text-sm leading-relaxed text-gray-400">
              When all weeks in your level are complete, generate a{' '}
              <span className="font-bold text-white">professional PDF</span> certificate.
            </p>
            <button className="w-full rounded-xl bg-yellow-500 py-3 font-black text-black transition-transform group-hover:scale-105">
              Generate
            </button>
          </div>
        </div>

        {/* --- REFERRAL FOOTER --- */}
        <div className="mx-auto mt-20 flex max-w-2xl items-center justify-between rounded-2xl border border-red-600/30 bg-red-600/10 p-6">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-red-600">Referral Program</p>
            <p className="mt-1 text-xs text-gray-300">Share your code and get 20% off your next month.</p>
          </div>
          <div className="rounded border border-yellow-600/20 bg-black px-4 py-2 font-mono text-yellow-500">
            SENSEI_2026
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
