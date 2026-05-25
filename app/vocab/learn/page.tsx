'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Volume2, CheckCircle2, XCircle,
  ChevronRight, RotateCcw, BookOpen, Brain, PenLine, Languages, Sparkles,
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

type Stage = 1 | 2 | 3 | 4

interface LearnWord extends VocabWord {
  stage:  Stage
  passed: boolean
}

/* ─── Stage config ───────────────────────────────────────────────── */
const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; color: string; hint: string }> = {
  1: { label: 'Giới thiệu',   icon: <BookOpen  className="h-3.5 w-3.5" />, color: 'text-blue-500',    hint: 'Đọc kỹ từ, định nghĩa và ví dụ' },
  2: { label: 'Trắc nghiệm',  icon: <Brain     className="h-3.5 w-3.5" />, color: 'text-violet-500',  hint: 'Chọn định nghĩa tiếng Việt đúng' },
  3: { label: 'Điền từ',      icon: <PenLine   className="h-3.5 w-3.5" />, color: 'text-emerald-500', hint: 'Điền từ còn thiếu vào câu ví dụ' },
  4: { label: 'Dịch câu',     icon: <Languages className="h-3.5 w-3.5" />, color: 'text-[#666]',      hint: 'Gõ câu tiếng Anh từ câu tiếng Việt' },
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

function makeFillBlank(sentence: string): { blanked: string; word: string } | null {
  const words      = sentence.split(' ')
  const candidates = words
    .map((w, i) => ({ w: w.replace(/[^a-zA-Z']/g, ''), i }))
    .filter(({ w }) => w.length >= 4)
  if (candidates.length === 0) return null
  const { w: word, i: idx } = candidates[Math.floor(Math.random() * candidates.length)]
  const blanked = words.map((w, i) => i === idx ? '___' : w).join(' ')
  return { blanked, word }
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[?!.,;:'"]/g, '').replace(/\s+/g, ' ')
}

/* ─── Session Complete ───────────────────────────────────────────── */
function LearnComplete({ total, onRetry, onBack }: { total: number; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-4 text-5xl">🎓</div>
      <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-1">
        Học xong {total} từ!
      </h2>
      <p className="text-[14px] text-[#666] mb-8">
        Bạn đã hoàn thành 4 giai đoạn học cho tất cả các từ.
      </p>
      <div className="flex gap-3">
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <RotateCcw className="h-3.5 w-3.5" /> Học lại
        </button>
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
          Xong <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Stage 1: Introduce ─────────────────────────────────────────── */
function StageIntroduce({ item, onNext }: { item: LearnWord; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>

        {/* Word + type + pronunciation */}
        <div className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-[26px] font-bold text-[#171717] dark:text-[#f5f5f5]">{item.word}</h2>
            <button onClick={() => speak(item.word)}
              className="shrink-0 rounded-[6px] p-1.5 text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            {item.type && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666] dark:text-[#aaa]">
                {item.type}
              </span>
            )}
            {item.pronunciation && (
              <span className="font-mono text-[13px] text-[#999]">{item.pronunciation}</span>
            )}
          </div>
          {item.samplePhrase && (
            <p className="text-[12px] text-[#aaa] italic mt-2">{item.samplePhrase}</p>
          )}
        </div>

        <div className="h-px bg-[#f0f0f0] dark:bg-[#2a2a2a]" />

        {/* Definitions */}
        <div className="space-y-3">
          {item.definitionVi && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#bbb] mb-1">🇻🇳 Định nghĩa</p>
              <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{item.definitionVi}</p>
            </div>
          )}
          {item.definitionEn && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#bbb] mb-1">🇬🇧 Definition</p>
              <p className="text-[14px] text-[#666] dark:text-[#aaa] italic leading-relaxed">{item.definitionEn}</p>
            </div>
          )}
        </div>

        {/* Examples */}
        {(item.example1En || item.example2En) && (
          <>
            <div className="h-px bg-[#f0f0f0] dark:bg-[#2a2a2a]" />
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-[#bbb]">Câu ví dụ</p>
              {[{ en: item.example1En, vi: item.example1Vi }, { en: item.example2En, vi: item.example2Vi }]
                .filter(ex => ex.en)
                .map((ex, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] text-[10px] font-medium text-[#999] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] text-[#333] dark:text-[#ccc]">{ex.en}</p>
                        <button onClick={() => speak(ex.en!)} className="text-[#ddd] hover:text-[#999] transition-colors cursor-pointer shrink-0">
                          <Volume2 className="h-3 w-3" />
                        </button>
                      </div>
                      {ex.vi && <p className="text-[12px] text-[#aaa] mt-0.5">{ex.vi}</p>}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      <button onClick={onNext}
        className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] py-3 text-[14px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
        Đã nhớ, tiếp theo <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Stage 2: Multiple Choice (choose correct VI definition) ────── */
function StageChoice({ item, distractors, onResult }: {
  item:        LearnWord
  distractors: string[]
  onResult:    (correct: boolean) => void
}) {
  const [options]  = useState(() => shuffle([item.definitionVi ?? item.word, ...distractors.slice(0, 3)]))
  const [selected, setSelected] = useState<string | null>(null)

  function pick(opt: string) {
    if (selected) return
    setSelected(opt)
    setTimeout(() => onResult(opt === (item.definitionVi ?? item.word)), 900)
  }

  const correct = item.definitionVi ?? item.word

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-2"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Định nghĩa tiếng Việt của từ này là gì?</p>
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5]">{item.word}</h2>
          {item.pronunciation && <span className="font-mono text-[13px] text-[#999]">{item.pronunciation}</span>}
          <button onClick={() => speak(item.word)} className="text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer">
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {item.type && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666]">{item.type}</span>}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {options.map((opt, i) => {
          const isCorrect  = opt === correct
          const isSelected = selected === opt
          return (
            <button key={i} onClick={() => pick(opt)}
              className={cn(
                'w-full rounded-[8px] px-4 py-3 text-left text-[14px] font-medium transition-all cursor-pointer',
                !selected && 'text-[#444] dark:text-[#ccc] hover:text-[#171717] dark:hover:text-[#f5f5f5]',
                selected && isCorrect  && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                selected && isSelected && !isCorrect && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                selected && !isSelected && !isCorrect && 'opacity-40',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <span className="mr-3 font-mono text-[11px] opacity-50">{String.fromCharCode(65 + i)}</span>
              {opt}
              {selected && isCorrect  && <CheckCircle2 className="inline ml-2 h-4 w-4 text-emerald-500" />}
              {selected && isSelected && !isCorrect && <XCircle className="inline ml-2 h-4 w-4 text-red-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Stage 3: Fill Blank (from example sentence) ───────────────── */
function StageFill({ item, onResult }: { item: LearnWord; onResult: (correct: boolean) => void }) {
  // Pick example1En first, fall back to example2En
  const sentence = item.example1En ?? item.example2En
  const fb       = sentence ? makeFillBlank(sentence) : null

  const [answer, setAnswer]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect]     = useState(false)

  if (!fb || !sentence) {
    // No usable example: show introduce and auto-pass
    return <StageIntroduce item={item} onNext={() => onResult(true)} />
  }

  function submit() {
    if (submitted) { onResult(correct); return }
    const ok = normalize(answer) === normalize(fb!.word)
    setCorrect(ok)
    setSubmitted(true)
    if (!ok) speak(sentence!)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Điền từ còn thiếu</p>
        <p className="text-[13px] text-[#666]">
          Từ: <strong className="text-[#171717] dark:text-[#f5f5f5]">{item.word}</strong>
          {item.type && <span className="ml-2 text-[11px] text-[#aaa]">({item.type})</span>}
        </p>
        <p className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed break-words">
          {fb.blanked.split('___').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                submitted
                  ? <span className={cn('px-2 py-0.5 rounded mx-1',
                      correct
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    )}>{fb.word}</span>
                  : <input autoFocus value={answer} onChange={e => setAnswer(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                      className="mx-1 inline-block w-28 rounded-[4px] border-b-2 border-[#171717] dark:border-[#f5f5f5] bg-transparent text-center text-[16px] font-semibold outline-none focus:border-blue-500" />
              )}
            </span>
          ))}
        </p>
        {submitted && !correct && (
          <p className="text-[12px] text-red-500">Đáp án đúng: <strong>{fb.word}</strong></p>
        )}
      </div>
      <button onClick={submit}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-[8px] py-3 text-[14px] font-semibold transition-all cursor-pointer',
          submitted
            ? correct
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
        )}>
        {submitted ? (correct ? '✓ Tiếp theo' : '→ Thử lại sau') : 'Kiểm tra'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Stage 4: Type (translate VI → EN example) ─────────────────── */
function StageType({ item, onResult }: { item: LearnWord; onResult: (correct: boolean) => void }) {
  // Show VI, user types EN
  const enSentence = item.example1En ?? item.example2En
  const viSentence = item.example1Vi ?? item.example2Vi

  const [answer, setAnswer]       = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect]     = useState(false)

  if (!enSentence || !viSentence) {
    return <StageIntroduce item={item} onNext={() => onResult(true)} />
  }

  function submit() {
    if (submitted) { onResult(correct); return }
    const ok = normalize(answer) === normalize(enSentence!)
    setCorrect(ok)
    setSubmitted(true)
    if (!ok) speak(enSentence!)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Dịch sang tiếng Anh</p>
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5]">{viSentence}</p>
          <button onClick={() => speak(enSentence)} className="text-[#bbb] hover:text-[#666] transition-colors p-1 cursor-pointer">
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <textarea autoFocus rows={2} value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Gõ câu tiếng Anh..."
          disabled={submitted}
          className="w-full rounded-[6px] bg-[#fafafa] dark:bg-[#222] px-3 py-2 text-[14px] text-[#171717] dark:text-[#f5f5f5] outline-none resize-none placeholder:text-[#bbb]"
          style={{ boxShadow: 'var(--shadow-border)' }} />
        {submitted && (
          <div className={cn('rounded-[6px] px-3 py-2 text-[13px]',
            correct
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400')}>
            {correct ? '✓ Chính xác!' : `Đáp án: ${enSentence}`}
          </div>
        )}
      </div>
      <button onClick={submit}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-[8px] py-3 text-[14px] font-semibold transition-all cursor-pointer',
          submitted
            ? correct ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
        )}>
        {submitted ? (correct ? '✓ Hoàn thành!' : '→ Tiếp theo') : 'Kiểm tra'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Main Learn Content ─────────────────────────────────────────── */
function LearnContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const topicId      = searchParams.get('topic_id')

  const [items, setItems]         = useState<LearnWord[]>([])
  const [index, setIndex]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [finished, setFinished]   = useState(false)
  const [topicName, setTopicName] = useState('')
  const [retryQueue, setRetryQueue] = useState<LearnWord[]>([])

  useEffect(() => {
    if (!topicId) return
    Promise.all([
      fetch(`/api/vocab/words?topic_id=${topicId}`).then(r => r.json()),
      fetch(`/api/vocab/topics/${topicId}`).then(r => r.json()),
    ]).then(([words, topic]) => {
      setTopicName(topic.data?.name ?? '')
      const queue: LearnWord[] = []
      for (const w of (words.data ?? [])) {
        for (const stage of [1, 2, 3, 4] as Stage[]) {
          queue.push({ ...w, stage, passed: false })
        }
      }
      setItems(queue)
    }).catch(() => toast.error('Không thể tải dữ liệu học'))
      .finally(() => setLoading(false))
  }, [topicId])

  const current      = items[index]
  const totalWords   = Math.floor(items.length / 4)
  const completedWords = Math.floor(index / 4)
  const progress     = items.length > 0 ? (index / items.length) * 100 : 0

  // Gather distractors (other VI definitions) for stage 2
  const distractors = items
    .filter(it => it.id !== current?.id && it.definitionVi)
    .map(it => it.definitionVi!)
    .filter((d, i, arr) => arr.indexOf(d) === i)

  function advance(correct: boolean) {
    if (!correct && current.stage === 2) {
      setRetryQueue(prev => [...prev, { ...current, stage: 1 }])
    }
    if (index + 1 >= items.length) {
      if (retryQueue.length > 0) {
        setItems(prev => [...prev, ...retryQueue])
        setRetryQueue([])
        toast(`Ôn lại ${retryQueue.length} từ chưa thuộc 🔁`, { duration: 2500 })
      } else {
        setFinished(true)
        toast.success(`Xuất sắc! Học xong ${totalWords} từ 🎓`, { duration: 3000 })
      }
    }
    setIndex(i => i + 1)
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
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          {current && (
            <div className={cn('flex items-center gap-1.5 text-[12px] font-medium', STAGE_META[current.stage].color)}>
              {STAGE_META[current.stage].icon}
              <span>{STAGE_META[current.stage].label}</span>
            </div>
          )}

          <span className="text-[13px] text-[#666] tabular-nums shrink-0">
            {completedWords} / {totalWords}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#f0f0f0] dark:bg-[#222]">
          <div className="h-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Stage steps */}
        <div className="mx-auto max-w-2xl px-4 py-2 flex items-center gap-1">
          {([1, 2, 3, 4] as Stage[]).map(s => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'h-1 w-full rounded-full transition-colors',
                current?.stage === s ? 'bg-[#171717] dark:bg-[#f5f5f5]' :
                current && s < current.stage ? 'bg-[#999]' : 'bg-[#eee] dark:bg-[#333]'
              )} />
              <span className={cn(
                'text-[9px] font-medium uppercase tracking-wide hidden sm:block',
                current?.stage === s ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#bbb]'
              )}>
                {STAGE_META[s].label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Hint bar */}
      {current && (
        <div className="mx-auto max-w-2xl px-4 py-3">
          <p className="text-[12px] text-[#999] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            {STAGE_META[current.stage].hint}
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 pb-12">
        {finished ? (
          <LearnComplete
            total={totalWords}
            onRetry={() => { setIndex(0); setFinished(false) }}
            onBack={() => router.back()}
          />
        ) : current ? (
          <div>
            {current.stage === 1 && <StageIntroduce item={current} onNext={() => advance(true)} />}
            {current.stage === 2 && <StageChoice item={current} distractors={distractors} onResult={advance} />}
            {current.stage === 3 && <StageFill item={current} onResult={advance} />}
            {current.stage === 4 && <StageType item={current} onResult={advance} />}
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
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
