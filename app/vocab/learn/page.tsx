'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Volume2, CheckCircle2, XCircle,
  ChevronRight, RotateCcw, Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak } from '@/lib/tts'
import { toast } from 'sonner'

/* ─── Types ─────────────────────────────────────────────────────── */
interface VocabWord {
  id:            string
  word:          string
  samplePhrase:  string | null
  type:          string | null
  pronunciation: string | null
  definitionVi:  string | null
  definitionEn:  string | null
  example1En:    string | null
  example1Vi:    string | null
  example2En:    string | null
  example2Vi:    string | null
}

// Quiz question types — all multiple choice
type QuizType = 'word-to-def' | 'def-to-word' | 'translate'

interface QuizQuestion {
  type:       QuizType
  word:       VocabWord
  prompt:     string
  subtitle?:  string
  correct:    string
  options:    string[]
}

/* ─── Utils ──────────────────────────────────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], count: number, exclude?: T): T[] {
  const filtered = exclude != null ? arr.filter(x => x !== exclude) : [...arr]
  return shuffle(filtered).slice(0, count)
}

/* ─── Question generator ─────────────────────────────────────────── */
function generateQuestions(words: VocabWord[]): QuizQuestion[] {
  if (words.length < 4) return []

  const allDefVi   = words.map(w => w.definitionVi).filter(Boolean) as string[]
  const allWords   = words.map(w => w.word)
  const allSentEn  = words.map(w => w.example1En ?? w.example2En).filter(Boolean) as string[]

  const questions: QuizQuestion[] = []
  const shuffled = shuffle(words)

  for (const w of shuffled) {
    // Type 1: Word → Definition (choose correct VI definition)
    if (w.definitionVi) {
      const distractors = pickRandom(allDefVi, 3, w.definitionVi)
      if (distractors.length >= 3) {
        questions.push({
          type: 'word-to-def',
          word: w,
          prompt: w.word,
          subtitle: w.pronunciation ?? undefined,
          correct: w.definitionVi,
          options: shuffle([w.definitionVi, ...distractors]),
        })
      }
    }

    // Type 2: Definition → Word (choose correct word)
    if (w.definitionVi) {
      const distractors = pickRandom(allWords, 3, w.word)
      if (distractors.length >= 3) {
        questions.push({
          type: 'def-to-word',
          word: w,
          prompt: w.definitionVi,
          correct: w.word,
          options: shuffle([w.word, ...distractors]),
        })
      }
    }

    // Type 3: Translate sentence (choose correct EN sentence from VI)
    const enSent = w.example1En ?? w.example2En
    const viSent = w.example1Vi ?? w.example2Vi
    if (enSent && viSent) {
      const distractors = pickRandom(allSentEn, 3, enSent)
      if (distractors.length >= 3) {
        questions.push({
          type: 'translate',
          word: w,
          prompt: viSent,
          subtitle: `Từ: ${w.word}`,
          correct: enSent,
          options: shuffle([enSent, ...distractors]),
        })
      }
    }
  }

  return shuffle(questions)
}

/* ─── Quiz label ─────────────────────────────────────────────────── */
const TYPE_LABEL: Record<QuizType, { label: string; color: string }> = {
  'word-to-def': { label: 'Nghĩa của từ',   color: 'text-blue-500' },
  'def-to-word': { label: 'Điền từ',         color: 'text-violet-500' },
  'translate':   { label: 'Dịch câu',        color: 'text-emerald-500' },
}

/* ─── Complete Screen ────────────────────────────────────────────── */
function QuizComplete({ total, correctCount, onRetry, onBack }: {
  total: number; correctCount: number; onRetry: () => void; onBack: () => void
}) {
  const pct = Math.round((correctCount / total) * 100)
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Trophy className="h-12 w-12 text-amber-400 mb-4" />
      <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-1">
        Hoàn thành!
      </h2>
      <p className="text-[14px] text-[#666] mb-2">
        {correctCount}/{total} câu đúng ({pct}%)
      </p>
      <div className="w-48 h-2 rounded-full bg-[#f0f0f0] dark:bg-[#222] overflow-hidden mb-8">
        <div className={cn('h-full rounded-full transition-all duration-700',
          pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
        )} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-3">
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <RotateCcw className="h-3.5 w-3.5" /> Làm lại
        </button>
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2.5 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
          Xong <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Quiz Card (multiple choice) ────────────────────────────────── */
function QuizCard({ question, onAnswer }: { question: QuizQuestion; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const meta = TYPE_LABEL[question.type]

  function pick(opt: string) {
    if (selected) return
    setSelected(opt)
    // Speak the correct word after selection
    speak(question.word.word)
    setTimeout(() => onAnswer(opt === question.correct), 1200)
  }

  return (
    <div className="space-y-4">
      {/* Question card */}
      <div className="rounded-[10px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-3"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[11px] font-medium uppercase tracking-widest', meta.color)}>{meta.label}</span>
          {question.type !== 'translate' && (
            <button onClick={() => speak(question.word.word)} className="text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer">
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {question.type === 'word-to-def' && (
          <div>
            <h2 className="text-[24px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">{question.prompt}</h2>
            {question.subtitle && <p className="font-mono text-[13px] text-[#888] mt-1">{question.subtitle}</p>}
            {question.word.type && (
              <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666] dark:text-[#aaa]">{question.word.type}</span>
            )}
          </div>
        )}

        {question.type === 'def-to-word' && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#bbb] mb-1">Từ nào có nghĩa:</p>
            <p className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{question.prompt}</p>
          </div>
        )}

        {question.type === 'translate' && (
          <div>
            {question.subtitle && <p className="text-[12px] text-[#999] mb-1">{question.subtitle}</p>}
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#bbb] mb-1">Dịch sang tiếng Anh:</p>
            <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{question.prompt}</p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2">
        {question.options.map((opt, i) => {
          const isCorrect  = opt === question.correct
          const isSelected = selected === opt
          return (
            <button key={i} onClick={() => pick(opt)}
              className={cn(
                'w-full rounded-[8px] px-4 py-3.5 text-left text-[13px] font-medium transition-all cursor-pointer leading-relaxed',
                !selected && 'text-[#444] dark:text-[#ccc] hover:text-[#171717] dark:hover:text-[#f5f5f5]',
                selected && isCorrect  && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                selected && isSelected && !isCorrect && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                selected && !isSelected && !isCorrect && 'opacity-30',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <span className="mr-3 font-mono text-[10px] opacity-40">{String.fromCharCode(65 + i)}</span>
              <span className={question.type === 'translate' ? 'text-[12px]' : ''}>{opt}</span>
              {selected && isCorrect  && <CheckCircle2 className="inline ml-2 h-4 w-4 text-emerald-500" />}
              {selected && isSelected && !isCorrect && <XCircle className="inline ml-2 h-4 w-4 text-red-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Main Learn Content ─────────────────────────────────────────── */
function LearnContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const topicId      = searchParams.get('topic_id')

  const [questions, setQuestions]       = useState<QuizQuestion[]>([])
  const [index, setIndex]               = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading]           = useState(true)
  const [finished, setFinished]         = useState(false)
  const [topicName, setTopicName]       = useState('')

  function startQuiz(words: VocabWord[]) {
    const q = generateQuestions(words)
    setQuestions(q)
    setIndex(0)
    setCorrectCount(0)
    setFinished(false)
  }

  useEffect(() => {
    if (!topicId) return
    Promise.all([
      fetch(`/api/vocab/words?topic_id=${topicId}`).then(r => r.json()),
      fetch(`/api/vocab/topics/${topicId}`).then(r => r.json()),
    ]).then(([words, topic]) => {
      setTopicName(topic.data?.name ?? '')
      startQuiz(words.data ?? [])
    }).catch(() => toast.error('Không thể tải dữ liệu học'))
      .finally(() => setLoading(false))
  }, [topicId])

  const current  = questions[index]
  const progress = questions.length > 0 ? (index / questions.length) * 100 : 0

  function handleAnswer(correct: boolean) {
    if (correct) setCorrectCount(c => c + 1)
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    )
  }

  if (!topicId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#999] text-sm">Thiếu topic_id</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-2xl px-4 h-12 flex items-center justify-between gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          <h1 className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{topicName}</h1>

          <span className="text-[12px] text-[#666] tabular-nums shrink-0">
            {index + 1}/{questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#f0f0f0] dark:bg-[#222]">
          <div className="h-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {finished ? (
          <QuizComplete
            total={questions.length}
            correctCount={correctCount}
            onRetry={() => startQuiz(questions.map(q => q.word).filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i))}
            onBack={() => router.back()}
          />
        ) : current ? (
          <QuizCard key={index} question={current} onAnswer={handleAnswer} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[14px] text-[#666]">Cần ít nhất 4 từ để bắt đầu trắc nghiệm.</p>
            <button onClick={() => router.back()}
              className="mt-4 flex items-center gap-1.5 text-[13px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại thêm từ
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function VocabLearnPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  )
}
