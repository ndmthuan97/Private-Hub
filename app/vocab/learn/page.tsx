'use client'

import { useState, useEffect, useCallback, useRef, Suspense, type TouchEvent as ReactTouchEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Volume2, CheckCircle2, XCircle,
  ChevronRight, RotateCcw, Trophy, BookA, TextCursorInput,
  PenLine, Shuffle, BookOpen, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak } from '@/lib/tts'
import { toast } from 'sonner'

/* ─── Types ─────────────────────────────────────────────────────── */
interface VocabWord {
  id: string
  word: string
  samplePhrase: string | null
  type: string | null
  pronunciation: string | null
  definitionVi: string | null
  definitionEn: string | null
  wordFamily: string | null
  synonyms: string | null
  antonyms: string | null
  example1En: string | null
  example1Vi: string | null
  example2En: string | null
  example2Vi: string | null
}

type LearnMode = 'en-vi' | 'vi-en' | 'writing' | 'mixed'
type QuizType = 'word-to-def' | 'fill-blank' | 'writing-tiles'

interface QuizQuestion {
  type: QuizType
  word: VocabWord
  prompt: string
  subtitle?: string
  correct: string
  options: string[]
  pronunciationMap?: Record<string, string>
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

// Only use letters from the word itself — no distractors
function generateLetterTiles(word: string): string[] {
  return shuffle(word.replace(/\s/g, '').split(''))
}

/* ─── Question generators ─────────────────────────────────────────── */
function buildPronunciationMap(words: VocabWord[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const w of words) { if (w.pronunciation) map[w.word] = w.pronunciation }
  return map
}

function generateEnViQuestions(words: VocabWord[]): QuizQuestion[] {
  if (words.length < 4) return []
  const allDefVi = words.map(w => w.definitionVi).filter(Boolean) as string[]
  return shuffle(words.filter(w => w.definitionVi).map(w => {
    const distractors = pickRandom(allDefVi, 3, w.definitionVi!)
    if (distractors.length < 3) return null
    return { type: 'word-to-def' as QuizType, word: w, prompt: w.word, subtitle: w.pronunciation ?? undefined, correct: w.definitionVi!, options: shuffle([w.definitionVi!, ...distractors]) }
  }).filter(Boolean) as QuizQuestion[])
}

// Replace the target word in a sentence with blanks
function maskWordInSentence(sentence: string, word: string): string | null {
  const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (!regex.test(sentence)) return null
  return sentence.replace(regex, '_____')
}

function generateViEnQuestions(words: VocabWord[]): QuizQuestion[] {
  if (words.length < 4) return []
  const allWords = words.map(w => w.word)
  return shuffle(words.filter(w => {
    if (!w.definitionVi) return false
    const ex1 = w.example1En && maskWordInSentence(w.example1En, w.word)
    const ex2 = w.example2En && maskWordInSentence(w.example2En, w.word)
    return ex1 || ex2
  }).map(w => {
    const ex1Masked = w.example1En ? maskWordInSentence(w.example1En, w.word) : null
    const ex2Masked = w.example2En ? maskWordInSentence(w.example2En, w.word) : null
    const masked = ex1Masked && ex2Masked
      ? (Math.random() > 0.5 ? ex1Masked : ex2Masked)
      : (ex1Masked ?? ex2Masked)!
    const distractors = pickRandom(allWords, 3, w.word)
    if (distractors.length < 3) return null
    return {
      type: 'fill-blank' as QuizType,
      word: w,
      prompt: masked,
      subtitle: w.definitionVi ?? undefined,
      correct: w.word,
      options: shuffle([w.word, ...distractors]),
    }
  }).filter(Boolean) as QuizQuestion[])
}

function generateWritingQuestions(words: VocabWord[]): QuizQuestion[] {
  return shuffle(words.filter(w => w.definitionVi).map(w => {
    return { type: 'writing-tiles' as QuizType, word: w, prompt: w.definitionVi!, subtitle: w.type ?? undefined, correct: w.word, options: generateLetterTiles(w.word) }
  }))
}

function generateMixedQuestions(words: VocabWord[]): QuizQuestion[] {
  if (words.length < 4) return []
  const allDefVi = words.map(w => w.definitionVi).filter(Boolean) as string[]
  const allWords = words.map(w => w.word)
  return shuffle(words.filter(w => w.definitionVi).map(w => {
    const rand = Math.random()
    if (rand < 0.3) {
      const d = pickRandom(allDefVi, 3, w.definitionVi!)
      if (d.length < 3) return null
      return { type: 'word-to-def' as QuizType, word: w, prompt: w.word, subtitle: w.pronunciation ?? undefined, correct: w.definitionVi!, options: shuffle([w.definitionVi!, ...d]) }
    } else if (rand < 0.6) {
      // Fill-in-the-blank if example sentence available
      const ex1Masked = w.example1En ? maskWordInSentence(w.example1En, w.word) : null
      const ex2Masked = w.example2En ? maskWordInSentence(w.example2En, w.word) : null
      const masked = ex1Masked ?? ex2Masked
      if (masked) {
        const distractors = pickRandom(allWords, 3, w.word)
        if (distractors.length >= 3) {
          return { type: 'fill-blank' as QuizType, word: w, prompt: masked, subtitle: w.definitionVi ?? undefined, correct: w.word, options: shuffle([w.word, ...distractors]) }
        }
      }
      // Fallback to writing tiles if no example sentence
      return { type: 'writing-tiles' as QuizType, word: w, prompt: w.definitionVi!, subtitle: w.type ?? undefined, correct: w.word, options: generateLetterTiles(w.word) }
    }
    return { type: 'writing-tiles' as QuizType, word: w, prompt: w.definitionVi!, subtitle: w.type ?? undefined, correct: w.word, options: generateLetterTiles(w.word) }
  }).filter(Boolean) as QuizQuestion[])
}

function generateQuestions(words: VocabWord[], mode: LearnMode): QuizQuestion[] {
  switch (mode) {
    case 'en-vi': return generateEnViQuestions(words)
    case 'vi-en': return generateViEnQuestions(words)
    case 'writing': return generateWritingQuestions(words)
    case 'mixed': return generateMixedQuestions(words)
  }
}

/* ─── Swipe hook ──────────────────────────────────────────────────── */
function useSwipe(onSwipeLeft: () => void, threshold = 50) {
  const startX = useRef(0)
  const startY = useRef(0)

  const onTouchStart = useCallback((e: ReactTouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: ReactTouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = Math.abs(e.changedTouches[0].clientY - startY.current)
    // Horizontal swipe left, not a vertical scroll
    if (dx < -threshold && dy < 100) onSwipeLeft()
  }, [onSwipeLeft, threshold])

  return { onTouchStart, onTouchEnd }
}

/* ─── Constants ───────────────────────────────────────────────────── */
const TYPE_LABEL: Record<QuizType, { label: string; color: string }> = {
  'word-to-def': { label: 'Anh → Việt', color: 'text-blue-500' },
  'fill-blank': { label: 'Điền từ vào câu', color: 'text-violet-500' },
  'writing-tiles': { label: 'Ghép chữ cái', color: 'text-emerald-500' },
}

const MODES = [
  { id: 'en-vi' as LearnMode, icon: <BookA className="h-5 w-5" />, label: 'Anh → Việt', desc: 'Xem từ tiếng Anh, chọn nghĩa tiếng Việt', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'vi-en' as LearnMode, icon: <TextCursorInput className="h-5 w-5" />, label: 'Điền từ vào câu', desc: 'Đọc câu tiếng Anh, điền từ còn thiếu', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  { id: 'writing' as LearnMode, icon: <PenLine className="h-5 w-5" />, label: 'Tập viết', desc: 'Gõ từ hoặc ghép chữ cái', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'mixed' as LearnMode, icon: <Shuffle className="h-5 w-5" />, label: 'Hỗn hợp', desc: 'Trắc nghiệm + viết kết hợp', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
]

/* ─── Word Detail Panel ───────────────────────────────────────────── */
function WordDetailPanel({ word, onClose }: { word: VocabWord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-lg rounded-t-[16px] sm:rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between px-5 py-4"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">{word.word}</h2>
              <button onClick={() => speak(word.word)} className="text-[#bbb] hover:text-[#666] transition-colors cursor-pointer">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {word.pronunciation && <span className="font-mono text-[12px] text-[#888]">{word.pronunciation}</span>}
              {word.type && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] text-[#666] dark:text-[#aaa]">{word.type}</span>}
            </div>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer shrink-0"
            style={{ boxShadow: 'var(--shadow-border)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {(word.definitionVi || word.definitionEn) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Định nghĩa</p>
              {word.definitionVi && <p className="text-[13px] text-[#171717] dark:text-[#f5f5f5]"><span className="text-[10px] font-medium text-[#bbb] mr-1.5">VI</span>{word.definitionVi}</p>}
              {word.definitionEn && <p className="text-[13px] text-[#666] dark:text-[#aaa]"><span className="text-[10px] font-medium text-[#bbb] mr-1.5">EN</span>{word.definitionEn}</p>}
            </div>
          )}

          {word.samplePhrase && (
            <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-3 py-2.5" style={{ boxShadow: 'var(--shadow-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] mb-1">Collocations</p>
              <p className="text-[12px] font-mono text-[#555] dark:text-[#aaa]">{word.samplePhrase}</p>
            </div>
          )}

          {(word.example1En || word.example2En) && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">Ví dụ</p>
              {word.example1En && (
                <div className="space-y-0.5">
                  <p className="text-[13px] italic text-[#444] dark:text-[#ccc]">&ldquo;{word.example1En}&rdquo;</p>
                  {word.example1Vi && <p className="text-[12px] text-[#888]">→ {word.example1Vi}</p>}
                </div>
              )}
              {word.example2En && (
                <div className="space-y-0.5">
                  <p className="text-[13px] italic text-[#444] dark:text-[#ccc]">&ldquo;{word.example2En}&rdquo;</p>
                  {word.example2Vi && <p className="text-[12px] text-[#888]">→ {word.example2Vi}</p>}
                </div>
              )}
            </div>
          )}

          {(word.wordFamily || word.synonyms || word.antonyms) && (
            <div className="grid grid-cols-1 gap-2">
              {word.wordFamily && (
                <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-3 py-2" style={{ boxShadow: 'var(--shadow-border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] mb-1">Word Family</p>
                  <p className="text-[12px] text-[#555] dark:text-[#aaa]">{word.wordFamily}</p>
                </div>
              )}
              {word.synonyms && (
                <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-3 py-2" style={{ boxShadow: 'var(--shadow-border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-1">Synonyms</p>
                  <p className="text-[12px] text-[#555] dark:text-[#aaa]">{word.synonyms}</p>
                </div>
              )}
              {word.antonyms && (
                <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-3 py-2" style={{ boxShadow: 'var(--shadow-border)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-1">Antonyms</p>
                  <p className="text-[12px] text-[#555] dark:text-[#aaa]">{word.antonyms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Answer Footer ────────────────────────────────────────────────── */
// Correct → auto-advance (caller handles timeout). Wrong → show "Tiếp" button + swipe hint.
function AnswerFooter({ isCorrect, correctAnswer, onNext }: {
  isCorrect: boolean; correctAnswer: string; onNext: () => void
}) {
  return (
    <div className={cn(
      'mt-3 rounded-[10px] px-4 py-3 flex items-center justify-between gap-3',
      isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
        <div className="min-w-0">
          <p className={cn('text-[12px] font-semibold', isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
            {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
          </p>
          {!isCorrect && (
            <p className="text-[11px] text-[#666] dark:text-[#aaa] truncate">
              Đáp án: <span className="font-semibold text-[#171717] dark:text-[#f5f5f5]">{correctAnswer}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isCorrect && (
          <button onClick={onNext}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[11px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
            Tiếp <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        {isCorrect && <span className="text-[10px] text-emerald-500/60 italic">vuốt ← hoặc đợi…</span>}
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
    speak(question.word.word)
    if (opt === question.correct) {
      setTimeout(() => onAnswer(true), 900)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[10px] bg-white dark:bg-[#1a1a1a] px-5 py-4 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', meta.color)}>{meta.label}</span>
          {question.type === 'word-to-def' && (
            <button onClick={() => speak(question.word.word)} className="text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer">
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {question.type === 'word-to-def' && (
          <div>
            <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">{question.prompt}</h2>
            {question.subtitle && <p className="font-mono text-[12px] text-[#888] mt-0.5">{question.subtitle}</p>}
            {question.word.type && <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666] dark:text-[#aaa]">{question.word.type}</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = opt === question.correct
          const isSelected = selected === opt
          return (
            <button key={i} onClick={() => pick(opt)}
              className={cn(
                'w-full rounded-[10px] px-4 py-3.5 text-left text-[13px] sm:text-[13px] font-medium transition-all cursor-pointer leading-relaxed flex items-center gap-2',
                !selected && 'text-[#444] dark:text-[#ccc] hover:text-[#171717] dark:hover:text-[#f5f5f5]',
                selected && isCorrect && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                selected && isSelected && !isCorrect && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                selected && !isSelected && !isCorrect && 'opacity-25',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <span className="font-mono text-[10px] opacity-40 shrink-0">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {selected && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              {selected && isSelected && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
            </button>
          )
        })}
      </div>

      {selected && (
        <AnswerFooter
          isCorrect={selected === question.correct}
          correctAnswer={question.correct}
          onNext={() => onAnswer(false)}
        />
      )}
    </div>
  )
}

/* ─── Fill-in-the-Blank Card (multiple choice) ───────────────────── */
function FillBlankCard({ question, onAnswer }: { question: QuizQuestion; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const meta = TYPE_LABEL[question.type]

  function pick(opt: string) {
    if (selected) return
    setSelected(opt)
    speak(question.word.word)
    if (opt === question.correct) {
      setTimeout(() => onAnswer(true), 900)
    }
  }

  const promptParts = question.prompt.split('_____')

  return (
    <div className="space-y-3">
      {showDetail && <WordDetailPanel word={question.word} onClose={() => setShowDetail(false)} />}

      {/* Question card — sentence with blank */}
      <div className="rounded-[10px] bg-white dark:bg-[#1a1a1a] px-5 py-4 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', meta.color)}>{meta.label}</span>
          <button onClick={() => setShowDetail(true)}
            className="flex items-center justify-center h-7 w-7 rounded-[5px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer"
            style={{ boxShadow: 'var(--shadow-border)' }}>
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sentence with blank */}
        <div className="text-[15px] leading-relaxed text-[#444] dark:text-[#ccc]">
          {promptParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < promptParts.length - 1 && (
                <span className={cn(
                  'inline-block mx-1 px-3 py-0.5 rounded-[4px] font-semibold min-w-[60px] text-center border-b-2',
                  selected && selected === question.correct && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-400',
                  selected && selected !== question.correct && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-400',
                  !selected && 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-300 dark:border-violet-600',
                )}>
                  {selected ?? '???'}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Hint: Vietnamese definition */}
        {question.subtitle && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] text-[#888]">Gợi ý</span>
            <p className="text-[12px] text-[#888] italic">{question.subtitle}</p>
          </div>
        )}
        {question.word.type && (
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666] dark:text-[#aaa]">{question.word.type}</span>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt, i) => {
          const isCorrect = opt === question.correct
          const isSelected = selected === opt
          return (
            <button key={i} onClick={() => pick(opt)}
              className={cn(
                'rounded-[10px] px-4 py-3 text-center text-[13px] font-medium transition-all cursor-pointer leading-relaxed',
                !selected && 'text-[#444] dark:text-[#ccc] hover:text-[#171717] dark:hover:text-[#f5f5f5]',
                selected && isCorrect && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                selected && isSelected && !isCorrect && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                selected && !isSelected && !isCorrect && 'opacity-25',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}>
              {opt}
              {selected && isCorrect && <CheckCircle2 className="inline-block ml-1.5 h-3.5 w-3.5 text-emerald-500" />}
              {selected && isSelected && !isCorrect && <XCircle className="inline-block ml-1.5 h-3.5 w-3.5 text-red-500" />}
            </button>
          )
        })}
      </div>

      {selected && (
        <AnswerFooter
          isCorrect={selected === question.correct}
          correctAnswer={question.correct}
          onNext={() => onAnswer(false)}
        />
      )}
    </div>
  )
}


/* ─── Writing Card (letter tiles + keyboard hybrid) ──────────────── */
function WritingTilesCard({ question, onAnswer }: { question: QuizQuestion; onAnswer: (correct: boolean) => void }) {
  const [selectedTiles, setSelectedTiles] = useState<{ letter: string; idx: number }[]>([])
  const [availableTiles, setAvailableTiles] = useState<{ letter: string; idx: number; used: boolean }[]>(() =>
    question.options.map((letter, idx) => ({ letter, idx, used: false }))
  )
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const meta = TYPE_LABEL[question.type]
  const currentWord = selectedTiles.map(t => t.letter).join('')

  // Focus hidden input so keyboard works immediately
  useEffect(() => { hiddenInputRef.current?.focus() }, [])

  // Auto-submit when tile count matches the word length
  useEffect(() => {
    if (submitted) return
    if (currentWord.length === question.correct.length) {
      const correct = currentWord.toLowerCase() === question.correct.toLowerCase()
      setSubmitted(true)
      setIsCorrect(correct)
      speak(question.word.word)
      if (correct) setTimeout(() => onAnswer(true), 900)
    }
  }, [currentWord, question.correct, submitted, onAnswer, question.word.word])

  function addTile(tile: { letter: string; idx: number }) {
    if (submitted) return
    setSelectedTiles(prev => [...prev, tile])
    setAvailableTiles(prev => prev.map(t => t.idx === tile.idx ? { ...t, used: true } : t))
  }

  function removeTile(tileIndex: number) {
    if (submitted) return
    const removed = selectedTiles[tileIndex]
    setSelectedTiles(prev => prev.filter((_, i) => i !== tileIndex))
    setAvailableTiles(prev => prev.map(t => t.idx === removed.idx ? { ...t, used: false } : t))
  }

  function clearAll() {
    if (submitted) return
    setSelectedTiles([])
    setAvailableTiles(prev => prev.map(t => ({ ...t, used: false })))
  }

  // Handle keyboard input — find first unused tile matching the typed letter
  function handleKeyDown(e: React.KeyboardEvent) {
    if (submitted) return
    if (e.key === 'Backspace') {
      if (selectedTiles.length > 0) removeTile(selectedTiles.length - 1)
      return
    }
    if (e.key.length !== 1) return
    const ch = e.key.toLowerCase()
    const match = availableTiles.find(t => !t.used && t.letter.toLowerCase() === ch)
    if (match) addTile(match)
  }

  return (
    <div className="space-y-3" onClick={() => hiddenInputRef.current?.focus()}>
      {showDetail && <WordDetailPanel word={question.word} onClose={() => setShowDetail(false)} />}
      {/* Hidden input to capture keyboard events */}
      <input ref={hiddenInputRef} className="sr-only" onKeyDown={handleKeyDown}
        aria-label="Keyboard input for letter tiles"
        readOnly value="" tabIndex={0} />

      {/* Question */}
      <div className="rounded-[10px] bg-white dark:bg-[#1a1a1a] px-5 py-4 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', meta.color)}>{meta.label}</span>
          <button onClick={() => setShowDetail(true)}
            className="flex items-center justify-center h-7 w-7 rounded-[5px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer"
            style={{ boxShadow: 'var(--shadow-border)' }}>
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{question.prompt}</p>
            {question.subtitle && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#333] text-[#666] dark:text-[#aaa] relative -top-[1px]">{question.subtitle}</span>}
            {question.word.pronunciation && <span className="font-mono text-[11px] text-[#888]">{question.word.pronunciation}</span>}
          </div>
          {question.word.definitionEn && (
            <p className="text-[12px] text-[#888] dark:text-[#777] leading-relaxed italic">{question.word.definitionEn}</p>
          )}
        </div>
      </div>

      {/* Answer slots */}
      <div className="rounded-[10px] bg-white dark:bg-[#1a1a1a] px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">
            Đáp án ({currentWord.length}/{question.correct.length})
          </span>
          {selectedTiles.length > 0 && !submitted && (
            <button onClick={clearAll} className="text-[11px] text-[#bbb] hover:text-[#666] transition-colors cursor-pointer">Xóa hết</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 min-h-[40px]">
          {Array.from({ length: question.correct.length }).map((_, i) => {
            const tile = selectedTiles[i]
            const isSpace = question.correct[i] === ' '
            const charCorrect = submitted && tile && tile.letter.toLowerCase() === question.correct[i]?.toLowerCase()
            const charWrong = submitted && tile && tile.letter.toLowerCase() !== question.correct[i]?.toLowerCase()

            if (isSpace) {
              return <div key={i} className="w-3" />
            }

            return (
              <button key={i} onClick={() => tile && removeTile(i)} disabled={submitted || !tile}
                className={cn(
                  'flex h-10 w-8 sm:h-8 sm:w-7 items-center justify-center rounded-[5px] text-[14px] sm:text-[13px] font-semibold transition-all',
                  tile ? cn(
                    'cursor-pointer',
                    !submitted && 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-80',
                    charCorrect && 'bg-emerald-500 text-white',
                    charWrong && 'bg-red-500 text-white',
                  ) : 'bg-[#f5f5f5] dark:bg-[#222] text-transparent border-2 border-dashed border-[#e0e0e0] dark:border-[#333]',
                )}>
                {tile?.letter ?? '·'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Available tiles — only letters from the word, no distractors */}
      {!submitted && (
        <div className="flex flex-wrap gap-2 sm:gap-1.5 justify-center py-2 sm:py-1">
          {availableTiles.map(tile => (
            <button key={tile.idx} onClick={() => addTile(tile)} disabled={tile.used}
              className={cn(
                'flex h-11 w-10 sm:h-9 sm:w-8 items-center justify-center rounded-[8px] text-[16px] sm:text-[14px] font-bold transition-all cursor-pointer',
                tile.used
                  ? 'opacity-15 scale-90 cursor-not-allowed'
                  : 'bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] hover:scale-110 active:scale-95',
              )}
              style={{ boxShadow: tile.used ? undefined : 'var(--shadow-card)' }}>
              {tile.letter}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      {!submitted && (
        <p className="text-center text-[10px] text-[#ccc]">
          Bấm chọn hoặc gõ bàn phím
        </p>
      )}

      {submitted && (
        <AnswerFooter isCorrect={isCorrect} correctAnswer={question.correct} onNext={() => onAnswer(false)} />
      )}
    </div>
  )
}

/* ─── Mode Selection ─────────────────────────────────────────────── */
function ModeSelection({ topicName, onSelect, onBack }: {
  topicName: string; onSelect: (mode: LearnMode) => void; onBack: () => void
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-xl px-4 h-11 flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
          <h1 className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{topicName}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-[18px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight mb-1">Chọn chế độ luyện tập</h2>
          <p className="text-[12px] text-[#999]">Chọn hình thức phù hợp để ôn luyện từ vựng</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {MODES.map(mode => (
            <button key={mode.id} onClick={() => onSelect(mode.id)}
              className="group rounded-[10px] bg-white dark:bg-[#111] p-4 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-[8px] mb-3 transition-colors', mode.bg, mode.color)}>
                {mode.icon}
              </div>
              <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-0.5">{mode.label}</p>
              <p className="text-[11px] text-[#888] leading-relaxed">{mode.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

/* ─── Complete Screen ────────────────────────────────────────────── */
function QuizComplete({ total, correctCount, onRetry, onBack, onChangeMode }: {
  total: number; correctCount: number; onRetry: () => void; onBack: () => void; onChangeMode: () => void
}) {
  const pct = Math.round((correctCount / total) * 100)
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className={cn('flex h-16 w-16 items-center justify-center rounded-full mb-4', pct >= 80 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]')}>
        <Trophy className={cn('h-7 w-7', pct >= 80 ? 'text-amber-400' : 'text-[#999]')} />
      </div>
      <h2 className="text-[20px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-1">Hoàn thành!</h2>
      <p className="text-[13px] text-[#666] mb-2">{correctCount}/{total} câu đúng ({pct}%)</p>
      <div className="w-40 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#222] overflow-hidden mb-6">
        <div className={cn('h-full rounded-full transition-all duration-700', pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={onRetry}
          className="flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[12px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <RotateCcw className="h-3.5 w-3.5" /> Làm lại
        </button>
        <button onClick={onChangeMode}
          className="flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[12px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <Shuffle className="h-3.5 w-3.5" /> Đổi chế độ
        </button>
        <button onClick={onBack}
          className="flex items-center gap-1.5 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2 text-[12px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
          Xong <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Main Learn Content ─────────────────────────────────────────── */
function LearnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const topicId = searchParams.get('topic_id')

  const [words, setWords] = useState<VocabWord[]>([])
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [topicName, setTopicName] = useState('')
  const [mode, setMode] = useState<LearnMode | null>(null)

  function startQuiz(wordList: VocabWord[], learnMode: LearnMode) {
    const q = generateQuestions(wordList, learnMode)
    setQuestions(q); setIndex(0); setCorrectCount(0); setFinished(false)
  }

  useEffect(() => {
    if (!topicId) return
    Promise.all([
      fetch(`/api/vocab/words?topic_id=${topicId}`).then(r => r.json()),
      fetch(`/api/vocab/topics/${topicId}`).then(r => r.json()),
    ]).then(([wordsRes, topic]) => {
      setTopicName(topic.data?.name ?? '')
      setWords(wordsRes.data ?? [])
    }).catch(() => toast.error('Không thể tải dữ liệu học'))
      .finally(() => setLoading(false))
  }, [topicId])

  const handleSelectMode = useCallback((selectedMode: LearnMode) => {
    setMode(selectedMode)
    startQuiz(words, selectedMode)
  }, [words])

  const handleChangeMode = useCallback(() => {
    setMode(null); setQuestions([]); setIndex(0); setCorrectCount(0); setFinished(false)
  }, [])

  const current = questions[index]
  const progress = questions.length > 0 ? (index / questions.length) * 100 : 0
  const [answered, setAnswered] = useState(false)

  function handleAnswer(correct: boolean) {
    if (correct) setCorrectCount(c => c + 1)
    setAnswered(true)
    if (index + 1 >= questions.length) setFinished(true)
    else setIndex(i => i + 1)
  }

  // Reset answered flag when index changes
  useEffect(() => { setAnswered(false) }, [index])

  // Swipe left to advance (only after auto-advance on correct, or manually on wrong)
  const swipeHandlers = useSwipe(useCallback(() => {
    if (!answered && current) return
    handleAnswer(false)
  }, [answered, current, index, questions.length]))

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
    </div>
  )

  if (!topicId) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-[#999] text-sm">Thiếu topic_id</p>
    </div>
  )

  if (!mode) return (
    <ModeSelection topicName={topicName} onSelect={handleSelectMode} onBack={() => router.back()} />
  )

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-xl px-4 h-11 flex items-center justify-between gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0 cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[12px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{topicName}</h1>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-[#f5f5f5] dark:bg-[#1a1a1a]', MODES.find(m => m.id === mode)?.color)}>
              {MODES.find(m => m.id === mode)?.label}
            </span>
          </div>
          <span className="text-[11px] text-[#999] tabular-nums shrink-0">{index + 1}/{questions.length}</span>
        </div>
        <div className="h-[2px] bg-[#f0f0f0] dark:bg-[#1a1a1a]">
          <div className="h-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-5"
        {...swipeHandlers}>
        {finished ? (
          <QuizComplete total={questions.length} correctCount={correctCount}
            onRetry={() => startQuiz(words, mode)} onBack={() => router.back()} onChangeMode={handleChangeMode} />
        ) : current ? (
          current.type === 'writing-tiles' ? <WritingTilesCard key={index} question={current} onAnswer={handleAnswer} /> :
          current.type === 'fill-blank' ? <FillBlankCard key={index} question={current} onAnswer={handleAnswer} /> :
          <QuizCard key={index} question={current} onAnswer={handleAnswer} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[13px] text-[#666]">Cần ít nhất 4 từ để bắt đầu trắc nghiệm.</p>
            <button onClick={() => router.back()}
              className="mt-3 flex items-center gap-1.5 text-[12px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer">
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
        <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  )
}
