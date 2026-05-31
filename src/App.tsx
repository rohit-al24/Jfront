import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { Capacitor } from '@capacitor/core'

import { MobileWelcome } from './components/MobileWelcome'
import { SplashScreen } from './components/SplashScreen'
import { TopBar } from './components/TopBar'
import { SidebarLayout } from './layout/SidebarLayout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Course } from './pages/app/Course'
import { Grammar } from './pages/app/Grammar'
import { GrammarLearn } from './pages/app/GrammarLearn'
import { GrammarQuiz } from './pages/app/GrammarQuiz'
import { GrammarPakka } from './pages/app/GrammarPakka'
import { AdaptiveQuiz } from './pages/app/AdaptiveQuiz'
import { Leaderboard } from './pages/app/Leaderboard'
import { Learn } from './pages/app/Learn'
import { Profile } from './pages/app/Profile'
import { Quiz } from './pages/app/Quiz'
import { QuizReport } from './pages/app/QuizReport'
import { QuizSession } from './pages/app/QuizSession'
import { Review } from './pages/app/Review'
import { Shop } from './pages/app/Shop'
import { Study } from './pages/app/Study'
import { StudyWeek } from './pages/app/StudyWeek'
import { Units } from './pages/app/Units'
import { VocabularyQuiz } from './pages/app/VocabularyQuiz'
import { VocabularyStudy } from './pages/app/VocabularyStudy'
import DailyRevise from './pages/app/DailyRevise'
import { Chat } from './pages/app/Chat'
import { ChatRoom } from './pages/app/ChatRoom'
import { People } from './pages/app/People'
import { Mondai } from './pages/Mondai'
import { RequireAuth } from './routes/RequireAuth'
import { RequirePaid } from './routes/RequirePaid'
import { usePaymentResume } from './hooks/usePaymentResume'

function App() {
  const location = useLocation()
  const initialMount = useRef(true)
  const [showSplash, setShowSplash] = useState(false)

  // Android: detect app resume after Cashfree external-browser payment
  usePaymentResume()

  const isNative = (() => {
    try {
      return Capacitor.isNativePlatform()
    } catch {
      return false
    }
  })()
  const isMobileUi = isNative || (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)

  const finishSplash = useCallback(() => {
    try {
      sessionStorage.setItem('bengo_splash_seen', '1')
    } catch (e) {
      // ignore storage errors
    }
    setShowSplash(false)
  }, [])

  useEffect(() => {
    if (!initialMount.current) return
    initialMount.current = false
    const path = location.pathname || '/'
    const isMobile = isMobileUi
    let seen = false
    try {
      seen = sessionStorage.getItem('bengo_splash_seen') === '1'
    } catch (e) {
      seen = false
    }

    // Desktop: show only on initial full-page load to '/'
    // Mobile: show on initial load to '/' when not already seen (clearing recents clears sessionStorage)
    if (path === '/') {
      if (isMobile) {
        if (!seen) setShowSplash(true)
      } else {
        setShowSplash(true)
      }
    }
  }, [])

  return (
    <div className="safe-area" style={{height: '100%'}}>
      {showSplash && <SplashScreen onFinish={finishSplash} />}
      <Routes>
        <Route path="/" element={isMobileUi ? <MobileWelcome /> : <Landing />} />
        <Route path="/login" element={isMobileUi ? <MobileWelcome initialMode="login" /> : <Login />} />
        <Route path="/register" element={isMobileUi ? <MobileWelcome initialMode="register" /> : <Register />} />
        <Route path="/mondai/:publicId" element={<Mondai />} />

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<SidebarLayout topbar={<TopBar />} />}>
            <Route index element={<Navigate to="/app/learn" replace />} />
            {/* Free pages — accessible without subscription */}
            <Route path="learn" element={<Learn />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="shop" element={<Shop />} />
            <Route path="profile" element={<Profile />} />
            <Route path="people" element={<People />} />
            <Route path="requests" element={<Navigate to="/app/people" replace />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:partnerId" element={<ChatRoom />} />

            {/* Gated pages — require active subscription */}
            <Route element={<RequirePaid />}>
              <Route path="study" element={<Study />} />
              <Route path="daily-revise" element={<DailyRevise />} />
              <Route path="study/week/:start" element={<StudyWeek />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="quiz/session/:mode" element={<QuizSession />} />
              <Route path="quiz/:date" element={<QuizReport />} />
              <Route path="review" element={<Review />} />
              <Route path="course" element={<Course />} />
              <Route path="course/:levelId" element={<Units />} />
              <Route path="course/unit/:unitId/vocabulary/study" element={<VocabularyStudy />} />
              <Route path="course/unit/:unitId/vocabulary/quiz" element={<VocabularyQuiz />} />
              <Route path="course/unit/:unitId/adaptive-quiz" element={<AdaptiveQuiz />} />
              <Route path="course/unit/:unitId/grammar/learn" element={<GrammarLearn />} />
              <Route path="course/unit/:unitId/grammar/quiz" element={<GrammarQuiz />} />
              <Route path="course/unit/:unitId/grammar" element={<Grammar />} />
              <Route path="course/unit/:unitId/grammar-pakka" element={<GrammarPakka />} />
            </Route>

            <Route path="*" element={<Navigate to="/app/learn" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
