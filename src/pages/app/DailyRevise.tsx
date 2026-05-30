import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch } from '../../api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  review_id?: number;
  source: 'unit' | 'review';
  type: 'vocab' | 'grammar';
  unit_id: number;
  unit_name: string;
  target: string;
  options: Record<string, string>;
  correct_answer: string;
  is_review: boolean;
  wrong_count?: number;
}

type Mode = 'select' | 'loading' | 'quiz' | 'results';
type Filter = 'all' | 'vocab' | 'grammar';

// ── Main Component ────────────────────────────────────────────────────────────

export default function DailyRevise() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [filter, setFilter] = useState<Filter>('all');
  const [pendingWrongs, setPendingWrongs] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ pending_wrongs?: number }>('/api/daily-revise/units/')
      .then((d) => setPendingWrongs(d.pending_wrongs ?? 0))
      .catch(() => {});
  }, []);

  const startQuiz = useCallback(async (f: Filter) => {
    setFilter(f);
    setMode('loading');
    setError('');
    try {
      const data = await apiFetch<{ questions?: QuizQuestion[] }>(
        `/api/daily-revise/quiz/?mode=${f}&include_wrongs=1`,
      );
      if (!data.questions || data.questions.length === 0) {
        setError('No questions available yet. Complete units with a quiz score >= 75% to unlock Daily Revise.');
        setMode('select');
        return;
      }
      setQuestions(data.questions);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setTotalXp(0);
      setMode('quiz');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setMode('select');
    }
  }, []);

  const handleAnswer = useCallback(async (key: string) => {
    if (selectedAnswer !== null || showResult) return;
    setSelectedAnswer(key);
    const q = questions[currentIndex];
    const isCorrect = key === q.correct_answer;
    setShowResult(true);

    try {
      const body = {
        question_type: q.type,
        item_id: q.id,
        is_correct: isCorrect,
        review_id: q.review_id ?? null,
      };
      const data = await apiFetch<{ xp_earned?: number }>('/api/daily-revise/answer/', {
        method: 'POST',
        json: body,
      });
      if (isCorrect) {
        setScore((s) => s + 1);
        setTotalXp((x) => x + (data.xp_earned ?? 0));
      }
    } catch {
      if (isCorrect) setScore((s) => s + 1);
    }

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setMode('results');
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      }
    }, 1400);
  }, [selectedAnswer, showResult, questions, currentIndex]);

  const q = questions[currentIndex];

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-[#07080B] px-4 py-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white">Daily Revise</h1>
              <p className="text-sm text-white/50">Refresh your knowledge and tackle wrong answers</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-600/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {pendingWrongs > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/25 px-4 py-3">
              <RefreshCw className="h-5 w-5 shrink-0 text-orange-400" />
              <div>
                <div className="text-sm font-bold text-orange-300">
                  {pendingWrongs} review item{pendingWrongs !== 1 ? 's' : ''} due today
                </div>
                <div className="text-xs text-white/40">Wrong answers from previous sessions will appear in the quiz</div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Choose what to revise</div>
            <div className="grid grid-cols-1 gap-3">
              {([
                { key: 'all' as Filter, label: 'All Questions', desc: 'Vocabulary + Grammar mixed', icon: 'target' },
                { key: 'vocab' as Filter, label: 'Vocabulary Only', desc: 'Word meanings and readings', icon: 'book' },
                { key: 'grammar' as Filter, label: 'Grammar Only', desc: 'Grammar structures and rules', icon: 'pencil' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => startQuiz(opt.key)}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 p-4 text-left hover:bg-white/10 hover:border-white/20 transition group"
                >
                  <BookOpen className="h-7 w-7 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-white group-hover:text-emerald-400 transition">{opt.label}</div>
                    <div className="text-xs text-white/40">{opt.desc}</div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-white/20 rotate-180 group-hover:text-emerald-400 transition" />
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-white/25">
            Questions come from units where you scored &gt;= 75%
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white/60 text-sm">Loading your quiz...</div>
        </div>
      </div>
    );
  }

  if (mode === 'results') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const review_count = questions.filter((q) => q.is_review).length;
    return (
      <div className="min-h-screen bg-[#07080B] px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
          <h2 className="text-3xl font-black text-white mb-2">Session Complete!</h2>
          <p className="text-white/50 mb-8">
            {filter === 'all' ? 'All questions' : filter === 'vocab' ? 'Vocabulary' : 'Grammar'} · Daily Revise
          </p>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-3xl font-black text-emerald-400">{score}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-black text-red-400">{questions.length - score}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Wrong</div>
              </div>
              <div>
                <div className="text-3xl font-black text-yellow-400">{pct}%</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Score</div>
              </div>
            </div>
            {totalXp > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400/10 py-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">+{totalXp} XP earned</span>
              </div>
            )}
          </div>

          {review_count > 0 && (
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3 mb-6 text-sm text-orange-300">
              <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
              {review_count} review item{review_count !== 1 ? 's' : ''} answered · wrong ones scheduled for re-review
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => startQuiz(filter)} className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 transition">
              Revise Again
            </button>
            <button onClick={() => setMode('select')} className="flex-1 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold py-3 transition">
              Change Mode
            </button>
          </div>
          <button onClick={() => navigate(-1)} className="mt-3 w-full rounded-2xl bg-transparent text-white/40 hover:text-white/60 font-medium py-2 transition text-sm">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  // QUIZ MODE
  const progress = (currentIndex / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#07080B] px-4 py-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              if (window.confirm('Exit Daily Revise? Your progress so far will be saved.')) {
                setMode('results');
              }
            }}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>{currentIndex + 1} / {questions.length}</span>
              <span className="text-yellow-400 font-bold">{score} correct</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {q.is_review && (
          <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/25 px-3 py-2 mb-3">
            <RefreshCw className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs text-orange-300 font-medium">
              Review item · answered wrong {q.wrong_count ?? 1} time{(q.wrong_count ?? 1) !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-4">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {q.unit_name} · {q.type === 'vocab' ? 'Vocabulary' : 'Grammar'}
          </div>
          <div className="text-3xl font-black text-white mt-3 mb-1">{q.target}</div>
          <div className="text-sm text-white/40">
            {q.type === 'vocab' ? 'What is the meaning?' : 'Choose the correct answer:'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {Object.entries(q.options).map(([key, value]) => {
            let btnClass = 'rounded-2xl border px-4 py-4 text-left transition font-medium text-sm w-full';
            if (!showResult) {
              btnClass += ' bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 cursor-pointer';
            } else if (key === q.correct_answer) {
              btnClass += ' bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
            } else if (key === selectedAnswer && key !== q.correct_answer) {
              btnClass += ' bg-red-500/20 border-red-500/50 text-red-300';
            } else {
              btnClass += ' bg-white/3 border-white/5 text-white/30';
            }
            return (
              <button key={key} className={btnClass} onClick={() => handleAnswer(key)} disabled={showResult}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{key}</span>
                  {showResult && key === q.correct_answer && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                  {showResult && key === selectedAnswer && key !== q.correct_answer && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                  {value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
