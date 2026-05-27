'use client'

import { useState, useEffect, use, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Volume2, Plus, Loader2, GraduationCap,
  Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, Table2, LayoutGrid, Search,
  ChevronLeft, ChevronRight, ClipboardList, CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { speak } from '@/lib/tts'
import { toast } from 'sonner'
import { Tip } from '@/components/ui/tip'

/* ─── Types ─────────────────────────────────────────────────────── */
interface VocabWord {
  id:            string
  topicId:       string
  word:          string
  samplePhrase:  string | null
  type:          string | null
  pronunciation: string | null
  definitionVi:  string | null
  definitionEn:  string | null
  wordFamily:    string | null
  synonyms:      string | null
  antonyms:      string | null
  example1En:    string | null
  example1Vi:    string | null
  example2En:    string | null
  example2Vi:    string | null
}
interface VocabTopic { id: string; name: string; slug: string; icon: string }

/* ─── Helpers ────────────────────────────────────────────────────── */
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  noun:       { bg: 'hsl(239,84%,67%,0.10)', text: 'hsl(239,84%,55%)' },
  verb:       { bg: 'hsl(160,84%,42%,0.10)', text: 'hsl(160,84%,32%)' },
  adjective:  { bg: 'hsl(38,92%,52%,0.12)',  text: 'hsl(38,75%,40%)' },
  adverb:     { bg: 'hsl(271,91%,65%,0.10)', text: 'hsl(271,71%,50%)' },
  phrase:     { bg: 'hsl(0,0%,0%,0.06)',     text: '#555' },
  idiom:      { bg: 'hsl(340,82%,52%,0.10)', text: 'hsl(340,72%,42%)' },
  expression: { bg: 'hsl(200,80%,55%,0.10)', text: 'hsl(200,80%,35%)' },
}
function typeStyle(t: string | null) {
  if (!t) return { bg: 'hsl(0,0%,0%,0.06)', text: '#888' }
  const match = t.toLowerCase().split(/[\/, ]+/).find(k => TYPE_COLORS[k])
  return match ? TYPE_COLORS[match] : { bg: 'hsl(0,0%,0%,0.06)', text: '#555' }
}
function Chip({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span className="inline-block text-[11px] px-2 py-0.5 rounded-[4px] font-medium"
      style={{ background: bg, color: text }}>{label}</span>
  )
}

/* ─── Word Form Modal ──────────────────────────────────────────── */
type WordFormData = Omit<VocabWord, 'id' | 'topicId'>
const EMPTY_FORM: WordFormData = {
  word: '', samplePhrase: '', type: '', pronunciation: '',
  definitionVi: '', definitionEn: '',
  wordFamily: '', synonyms: '', antonyms: '',
  example1En: '', example1Vi: '', example2En: '', example2Vi: '',
}
const WORD_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'expression', 'idiom']

function WordFormModal({ topicId, initial, onClose, onSaved }: {
  topicId: string; initial?: VocabWord; onClose: () => void; onSaved: (w: VocabWord) => void
}) {
  const isEdit = !!initial
  const [form, setForm]     = useState<WordFormData>(initial ? { ...initial } : { ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)
  function set(k: keyof WordFormData, v: string) { setForm(p => ({ ...p, [k]: v || null })) }

  async function handleSubmit() {
    if (!form.word?.trim()) return
    setLoading(true)
    try {
      const url    = isEdit ? `/api/vocab/words/${initial!.id}` : '/api/vocab/words'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, topicId }) })
      const json   = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success(isEdit ? 'Đã cập nhật từ' : `Đã thêm "${form.word}"`)
      onSaved(json.data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lỗi khi lưu từ') }
    finally { setLoading(false) }
  }

  const Field = ({ label, k, placeholder, mono }: { label: string; k: keyof WordFormData; placeholder?: string; mono?: boolean }) => (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-1">{label}</label>
      <input value={(form[k] as string) ?? ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
        className={cn('w-full h-8 px-3 text-[13px] rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#ccc]', mono && 'font-mono')}
        style={{ boxShadow: 'var(--shadow-border)' }} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-lg rounded-[10px] bg-white dark:bg-[#111] p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-[#111] pb-1">
          <h2 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">{isEdit ? 'Chỉnh sửa từ' : 'Thêm từ mới'}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Field label="Từ / cụm từ *" k="word" placeholder="sustainable" /></div>
          <div className="col-span-2"><Field label="Cụm từ mẫu" k="samplePhrase" placeholder="sustainable development, sustainable energy" /></div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-1">Loại từ</label>
            <select value={form.type ?? ''} onChange={e => set('type', e.target.value)}
              className="w-full h-8 px-3 text-[13px] rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <option value="">— chọn —</option>
              {WORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Phiên âm" k="pronunciation" placeholder="/səˈsteɪnəbl/" mono />
          <div className="col-span-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-1">Định nghĩa tiếng Việt</label>
            <textarea value={form.definitionVi ?? ''} onChange={e => set('definitionVi', e.target.value)} rows={2} placeholder="có thể duy trì lâu dài..." className="w-full px-3 py-2 text-[13px] rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none resize-none placeholder:text-[#ccc]" style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-1">English Definition</label>
            <textarea value={form.definitionEn ?? ''} onChange={e => set('definitionEn', e.target.value)} rows={2} placeholder="able to continue without damaging..." className="w-full px-3 py-2 text-[13px] rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none resize-none placeholder:text-[#ccc]" style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
          <div className="col-span-2"><Field label="Word Family" k="wordFamily" placeholder="sustain (v), sustainability (n), sustainably (adv)" /></div>
          <Field label="Đồng nghĩa" k="synonyms" placeholder="eco-friendly, renewable" />
          <Field label="Trái nghĩa"  k="antonyms" placeholder="unsustainable" />
          <div className="col-span-2 pt-1" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 -1px 0 0 inset', paddingTop: 12 }}>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-3">Câu ví dụ</p>
            <div className="space-y-3">
              <Field label="Ví dụ 1 (EN)" k="example1En" placeholder="We need sustainable solutions to the energy crisis." />
              <Field label="Ví dụ 1 (VI)" k="example1Vi" placeholder="Chúng ta cần các giải pháp bền vững..." />
              <Field label="Ví dụ 2 (EN)" k="example2En" placeholder="The company adopted sustainable packaging." />
              <Field label="Ví dụ 2 (VI)" k="example2Vi" placeholder="Công ty đã áp dụng bao bì bền vững." />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-[6px] text-[13px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-border)' }}>Hủy</button>
          <button onClick={handleSubmit} disabled={loading || !form.word?.trim()} className="flex-1 h-9 rounded-[6px] text-[13px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {isEdit ? 'Lưu' : 'Thêm từ'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── AI Fill Modal ─────────────────────────────────────────────── */
type AiFillPhase = 'input' | 'loading' | 'preview'
function AiFillModal({ topicId, onClose, onSaved }: { topicId: string; onClose: () => void; onSaved: (w: VocabWord[]) => void }) {
  const [phase, setPhase]       = useState<AiFillPhase>('input')
  const [rawInput, setRawInput] = useState('')
  const [preview, setPreview]   = useState<VocabWord[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function parseWords() { return rawInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 30) }

  async function handleGenerate() {
    const words = parseWords()
    if (!words.length) return
    setError(null); setPhase('loading')
    try {
      const res  = await fetch('/api/vocab/ai-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      setPreview(json.data.preview ?? []); setPhase('preview')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'AI fill thất bại'); setPhase('input') }
  }

  async function handleSaveAll() {
    setSaving(true)
    try {
      const res  = await fetch('/api/vocab/ai-fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ words: preview.map(p => p.word), topicId }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success(`Đã thêm ${json.data.saved.length} từ ✨`)
      onSaved(json.data.saved)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lưu thất bại') }
    finally { setSaving(false) }
  }

  const wordCount = parseWords().length

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-xl rounded-[10px] bg-white dark:bg-[#111] flex flex-col max-h-[90vh]" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 1px 0 0' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h2 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">AI Fill từ vựng</h2>
            {phase === 'preview' && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'hsl(271,91%,65%,0.10)', color: 'hsl(271,71%,50%)' }}>{preview.length} từ</span>}
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {phase === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-widest text-[#aaa] mb-2">Nhập danh sách từ / cụm từ</label>
                <textarea autoFocus rows={10} value={rawInput} onChange={e => setRawInput(e.target.value)}
                  placeholder={`Mỗi từ một dòng hoặc cách nhau bằng dấu phẩy. Tối đa 30 từ.\n\nVí dụ:\nsustainable\nambiguous\nbreak the ice`}
                  className="w-full px-3 py-2.5 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none resize-none placeholder:text-[#ccc] font-mono leading-relaxed"
                  style={{ boxShadow: 'var(--shadow-border)' }} />
                <p className="text-[11px] text-[#bbb] mt-1.5">{wordCount > 0 ? `${wordCount} từ — AI sẽ tự điền định nghĩa, phiên âm, ví dụ...` : 'Chưa có từ nào'}</p>
              </div>
              {error && <div className="flex items-center gap-2 text-[12px] text-red-500 bg-red-50 dark:bg-red-900/20 rounded-[6px] px-3 py-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</div>}
            </div>
          )}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Sparkles className="h-8 w-8 text-violet-400 animate-pulse" />
              <div className="text-center"><p className="text-[14px] font-medium text-[#171717] dark:text-[#f5f5f5]">AI đang xử lý…</p><p className="text-[12px] text-[#999] mt-1">Tra từ điển, tạo ví dụ, phân tích từ loại</p></div>
              <Loader2 className="h-5 w-5 animate-spin text-[#bbb]" />
            </div>
          )}
          {phase === 'preview' && (
            <div className="space-y-3">
              <p className="text-[11px] text-[#999]">Kiểm tra lại trước khi lưu.</p>
              {preview.map((w, i) => (
                <div key={i} className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-4 py-3 space-y-1.5" style={{ boxShadow: 'var(--shadow-border)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-bold text-[#171717] dark:text-[#f5f5f5]">{w.word}</span>
                    {w.type && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: typeStyle(w.type).bg, color: typeStyle(w.type).text }}>{w.type}</span>}
                    {w.pronunciation && <span className="font-mono text-[11px] text-[#888]">{w.pronunciation}</span>}
                  </div>
                  {w.definitionVi && <p className="text-[12px] text-[#555] dark:text-[#aaa]">🇻🇳 {w.definitionVi}</p>}
                  {w.example1En && <p className="text-[11px] text-[#aaa] border-l-2 border-[#e8e8e8] dark:border-[#333] pl-2">{w.example1En}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 shrink-0 flex gap-2" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 -1px 0 0' }}>
          {phase === 'input' && (
            <>
              <button onClick={onClose} className="flex-1 h-9 rounded-[6px] text-[13px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-border)' }}>Hủy</button>
              <button onClick={handleGenerate} disabled={wordCount === 0} className="flex-1 h-9 rounded-[6px] text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity" style={{ background: 'hsl(271,91%,65%)', color: '#fff' }}>
                <Sparkles className="h-3.5 w-3.5" /> AI Generate ({wordCount})
              </button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <button onClick={() => setPhase('input')} className="h-9 px-4 rounded-[6px] text-[13px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-border)' }}>← Sửa lại</button>
              <button onClick={handleSaveAll} disabled={saving} className="flex-1 h-9 rounded-[6px] text-[13px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Lưu tất cả {preview.length} từ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Paste Import Modal ────────────────────────────────────────── */
const PASTE_COLS = [
  { key: 'word',          label: 'Từ / Cụm từ *', width: 160, mono: false },
  { key: 'type',          label: 'Loại từ',        width: 90,  mono: false },
  { key: 'pronunciation', label: 'Phiên âm',       width: 120, mono: true  },
  { key: 'definitionVi',  label: 'Định nghĩa VI',  width: 220, mono: false },
  { key: 'definitionEn',  label: 'Định nghĩa EN',  width: 220, mono: false },
  { key: 'example1En',    label: 'Ví dụ 1',        width: 260, mono: false },
  { key: 'example2En',    label: 'Ví dụ 2',        width: 260, mono: false },
  { key: 'wordFamily',    label: 'Word Family',    width: 180, mono: false },
  { key: 'synonyms',      label: 'Đồng nghĩa',     width: 180, mono: false },
  { key: 'antonyms',      label: 'Trái nghĩa',     width: 180, mono: false },
] as const
type ColKey = typeof PASTE_COLS[number]['key']
type GridRow = Record<ColKey, string>
const EMPTY_ROW = (): GridRow => ({ word: '', type: '', pronunciation: '', definitionVi: '', definitionEn: '', example1En: '', example2En: '', wordFamily: '', synonyms: '', antonyms: '' })

function PasteImportModal({ topicId, onClose, onSaved }: { topicId: string; onClose: () => void; onSaved: (w: VocabWord[]) => void }) {
  const [rows, setRows]         = useState<GridRow[]>(() => Array.from({ length: 5 }, EMPTY_ROW))
  const [saving, setSaving]     = useState(false)
  const [focused, setFocused]   = useState<[number, ColKey] | null>(null)
  const [addCount, setAddCount] = useState('5')

  function setCell(ri: number, col: ColKey, val: string) { setRows(prev => prev.map((r, i) => i === ri ? { ...r, [col]: val } : r)) }

  function handlePaste(e: React.ClipboardEvent, startRow: number, startColIdx: number) {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()
    const pastedRows = text.split(/\r?\n/).filter(l => l.length > 0).map(l => l.split('\t'))
    setRows(prev => {
      const next = prev.map(r => ({ ...r }))
      const needed = startRow + pastedRows.length
      while (next.length < needed) next.push(EMPTY_ROW())
      pastedRows.forEach((cells, ri) => { cells.forEach((val, ci) => { const idx = startColIdx + ci; if (idx < PASTE_COLS.length) next[startRow + ri][PASTE_COLS[idx].key] = val.trim() }) })
      return next
    })
  }

  async function handleSave() {
    const valid = rows.filter(r => r.word.trim())
    if (!valid.length) { toast.error('Chưa có từ nào hợp lệ'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/vocab/words/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicId, rows: valid }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success(`Đã thêm ${json.data.length} từ!`)
      onSaved(json.data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Lưu thất bại') }
    finally { setSaving(false) }
  }

  const validCount = rows.filter(r => r.word.trim()).length

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full max-w-[96vw] rounded-[10px] bg-white dark:bg-[#111] flex flex-col" style={{ boxShadow: 'var(--shadow-card)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 1px 0 0' }}>
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-[#666]" />
            <h2 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Thêm hàng loạt</h2>
            <span className="text-[11px] text-[#bbb]">— Paste trực tiếp từ Excel / Google Sheets</span>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="border-collapse" style={{ minWidth: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 36 }} />
              {PASTE_COLS.map(c => <col key={c.key} style={{ width: c.width }} />)}
              <col style={{ width: 32 }} />
            </colgroup>
            <thead>
              <tr className="bg-[#fafafa] dark:bg-[#1a1a1a]">
                <th className="border-b border-r border-[#ebebeb] dark:border-[#222] text-[10px] text-[#aaa] font-medium py-2 px-2 text-right select-none">#</th>
                {PASTE_COLS.map(c => <th key={c.key} className="border-b border-r border-[#ebebeb] dark:border-[#222] text-left text-[10px] font-medium uppercase tracking-widest text-[#aaa] py-2 px-3 select-none whitespace-nowrap">{c.label}</th>)}
                <th className="border-b border-[#ebebeb] dark:border-[#222] w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={cn('group hover:bg-[#fafafa] dark:hover:bg-[#161616] transition-colors', !row.word.trim() && 'opacity-60')}>
                  <td className="border-b border-r border-[#ebebeb] dark:border-[#222] text-[11px] text-[#ccc] text-right px-2 select-none">{ri + 1}</td>
                  {PASTE_COLS.map((col, ci) => (
                    <td key={col.key} className={cn('border-b border-r border-[#ebebeb] dark:border-[#222] p-0', focused?.[0] === ri && focused?.[1] === col.key && 'ring-2 ring-inset ring-blue-400 dark:ring-blue-600 z-10 relative')}>
                      <input value={row[col.key]} onChange={e => setCell(ri, col.key, e.target.value)}
                        onFocus={() => setFocused([ri, col.key])} onBlur={() => setFocused(null)}
                        onPaste={e => handlePaste(e, ri, ci)}
                        className={cn('w-full h-8 px-3 text-[12px] bg-transparent outline-none text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#ddd]', col.mono && 'font-mono', col.key === 'word' && 'font-medium')}
                        placeholder={col.key === 'word' ? 'word…' : ''} />
                    </td>
                  ))}
                  <td className="border-b border-[#ebebeb] dark:border-[#222] text-center">
                    <button onClick={() => setRows(prev => prev.filter((_, i) => i !== ri))} className="opacity-0 group-hover:opacity-100 flex h-5 w-5 mx-auto items-center justify-center rounded text-[#ccc] hover:text-red-400 transition-all cursor-pointer"><X className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 shrink-0 flex items-center justify-between gap-3" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 -1px 0 0' }}>
          <div className="flex items-center gap-2">
            {/* Add N rows control */}
            <div className="flex items-center rounded-[6px] overflow-hidden" style={{ boxShadow: 'var(--shadow-border)' }}>
              <button
                onClick={() => {
                  const n = Math.max(1, Math.min(100, parseInt(addCount) || 5))
                  setRows(prev => [...prev, ...Array.from({ length: n }, EMPTY_ROW)])
                }}
                className="flex items-center gap-1.5 h-8 px-3 text-[12px] text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer whitespace-nowrap">
                <Plus className="h-3.5 w-3.5" /> Thêm
              </button>
              <input
                type="number" min={1} max={100}
                value={addCount}
                onChange={e => setAddCount(e.target.value)}
                onBlur={e => { const n = parseInt(e.target.value); if (!n || n < 1) setAddCount('5') }}
                className="w-12 h-8 px-2 text-[12px] text-center bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none border-l border-[#ebebeb] dark:border-[#222]"
              />
              <span className="h-8 flex items-center pr-3 text-[11px] text-[#bbb] border-l border-[#ebebeb] dark:border-[#222] pl-2">hàng</span>
            </div>
            <span className="text-[11px] text-[#bbb]">{validCount > 0 ? `${validCount} từ hợp lệ` : 'Cột đầu tiên là từ bắt buộc'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-8 px-4 rounded-[6px] text-[12px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-border)' }}>Hủy</button>
            <button onClick={handleSave} disabled={saving || validCount === 0} className="flex items-center gap-1.5 h-8 px-4 rounded-[6px] text-[12px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Lưu {validCount > 0 ? `${validCount} từ` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Flashcard view ─────────────────────────────────────────────── */
function FlashcardView({ words }: { words: VocabWord[] }) {
  const [idx, setIdx] = useState(0)

  const word = words[idx]
  if (!word) return null

  function go(dir: 1 | -1) {
    setIdx(i => Math.max(0, Math.min(words.length - 1, i + dir)))
  }

  // Touch swipe support
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (dy > 80) return // vertical scroll, ignore
    if (dx < -50) go(1)  // swipe left = next
    if (dx > 50) go(-1)  // swipe right = prev
  }, [words.length])

  const ts       = typeStyle(word.type)
  const families = word.wordFamily?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const synonyms = word.synonyms?.split(',').map(s => s.trim()).filter(Boolean)  ?? []
  const antonyms = word.antonyms?.split(',').map(s => s.trim()).filter(Boolean)  ?? []
  const examples = [
    { en: word.example1En, vi: word.example1Vi, n: 1 },
    { en: word.example2En, vi: word.example2Vi, n: 2 },
  ].filter(ex => ex.en)
  const hasRight = examples.length > 0 || families.length > 0 || synonyms.length > 0 || antonyms.length > 0

  return (
    <div className="py-6 px-4 md:px-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => go(-1)} disabled={idx === 0}
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[12px] text-[#999] tabular-nums">{idx + 1} / {words.length}</span>
        <button onClick={() => go(1)} disabled={idx === words.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors cursor-pointer"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Card */}
      <div className="rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}>

        {/* Body: split left / right */}
        <div className="flex flex-col md:flex-row">

          {/* Left: word header + definitions */}
          <div className="flex-1 px-6 md:px-8 py-6 space-y-4">
            {/* Word */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[26px] md:text-[30px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight leading-tight">{word.word}</h2>
                <button onClick={() => speak(word.word)}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors cursor-pointer"
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {word.type && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: ts.bg, color: ts.text }}>{word.type}</span>}
                {word.pronunciation && <span className="font-mono text-[12px] text-[#888]">{word.pronunciation}</span>}
                {word.samplePhrase && <span className="text-[11px] text-[#aaa] italic">— {word.samplePhrase}</span>}
              </div>
            </div>

            {/* Definitions */}
            {word.definitionVi && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1">🇻🇳 Định nghĩa</p>
                <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{word.definitionVi}</p>
              </div>
            )}
            {word.definitionEn && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1">🇬🇧 Definition</p>
                <p className="text-[13px] text-[#555] dark:text-[#aaa] italic leading-relaxed">{word.definitionEn}</p>
              </div>
            )}
          </div>

          {/* Right: examples + word family + syn/ant */}
          {hasRight && (
            <div className="flex-1 px-6 md:px-8 py-6 space-y-4 border-t md:border-t-0 md:border-l border-[#f0f0f0] dark:border-[#222]">
              {/* Examples */}
              {examples.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-2">Ví dụ</p>
                  <div className="space-y-3">
                    {examples.map(ex => (
                      <div key={ex.n} className="flex gap-2">
                        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#f0f0f0] dark:bg-[#222] text-[9px] font-medium text-[#999] shrink-0 mt-0.5">{ex.n}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12px] text-[#333] dark:text-[#ccc] leading-relaxed">{ex.en}</p>
                            <button onClick={() => speak(ex.en!)} className="text-[#ddd] hover:text-[#999] transition-colors cursor-pointer shrink-0"><Volume2 className="h-2.5 w-2.5" /></button>
                          </div>
                          {ex.vi && <p className="text-[11px] text-[#aaa] mt-0.5">{ex.vi}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Word family */}
              {families.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">Word Family</p>
                  <div className="flex flex-wrap gap-1">{families.map(f => <Chip key={f} label={f} bg="hsl(0,0%,0%,0.05)" text="#555" />)}</div>
                </div>
              )}

              {/* Synonyms / Antonyms */}
              {(synonyms.length > 0 || antonyms.length > 0) && (
                <div className="flex gap-4">
                  {synonyms.length > 0 && (
                    <div className="flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">Đồng nghĩa</p>
                      <div className="flex flex-wrap gap-1">{synonyms.map(s => <Chip key={s} label={s} bg="hsl(160,84%,42%,0.08)" text="hsl(160,84%,28%)" />)}</div>
                    </div>
                  )}
                  {antonyms.length > 0 && (
                    <div className="flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">Trái nghĩa</p>
                      <div className="flex flex-wrap gap-1">{antonyms.map(a => <Chip key={a} label={a} bg="hsl(0,84%,60%,0.08)" text="hsl(0,72%,42%)" />)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard / swipe hint */}
      <p className="mt-3 text-center text-[11px] text-[#ccc]">vuốt ← → hoặc bấm phím để chuyển thẻ</p>
    </div>
  )
}

/* ─── Word Detail Modal ──────────────────────────────────────────── */
function WordDetailModal({ word, onClose, onEdit, onDelete }: { word: VocabWord; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const ts = typeStyle(word.type)
  const families = word.wordFamily?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  const synonyms = word.synonyms?.split(',').map(s => s.trim()).filter(Boolean)  ?? []
  const antonyms = word.antonyms?.split(',').map(s => s.trim()).filter(Boolean)  ?? []

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-[12px] bg-white dark:bg-[#111] flex flex-col max-h-[90vh]" style={{ boxShadow: 'var(--shadow-card)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 1px 0 0' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[20px] font-bold text-[#171717] dark:text-[#f5f5f5]">{word.word}</h2>
            <button onClick={() => speak(word.word)} className="text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"><Volume2 className="h-4 w-4" /></button>
            {word.type && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: ts.bg, color: ts.text }}>{word.type}</span>}
            {word.pronunciation && <span className="font-mono text-[13px] text-[#888]">{word.pronunciation}</span>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
            <div className="w-px h-4 bg-[#ebebeb] dark:bg-[#333] mx-1 my-auto" />
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col md:flex-row gap-8">
          {/* Left Column */}
          <div className="flex-1 space-y-6">
            {word.samplePhrase && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">Cụm từ mẫu</p>
                <p className="text-[14px] text-[#171717] dark:text-[#ccc] italic">{word.samplePhrase}</p>
              </div>
            )}
            
            <div className="grid sm:grid-cols-2 gap-4">
              {word.definitionVi && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">🇻🇳 Định nghĩa</p>
                  <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{word.definitionVi}</p>
                </div>
              )}
              {word.definitionEn && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-1.5">🇬🇧 Definition</p>
                  <p className="text-[14px] text-[#555] dark:text-[#aaa] italic leading-relaxed">{word.definitionEn}</p>
                </div>
              )}
            </div>

            {(word.example1En || word.example2En) && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-3">Câu ví dụ</p>
                <div className="space-y-4">
                  {[{ en: word.example1En, vi: word.example1Vi, n: 1 }, { en: word.example2En, vi: word.example2Vi, n: 2 }]
                    .filter(ex => ex.en).map(ex => (
                      <div key={ex.n} className="flex gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0f0f0] dark:bg-[#222] text-[10px] font-medium text-[#999] shrink-0 mt-0.5">{ex.n}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] text-[#333] dark:text-[#ccc]">{ex.en}</p>
                            <button onClick={() => speak(ex.en!)} className="text-[#ddd] hover:text-[#999] transition-colors cursor-pointer shrink-0"><Volume2 className="h-3 w-3" /></button>
                          </div>
                          {ex.vi && <p className="text-[12px] text-[#aaa] mt-1">{ex.vi}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column */}
          <div className="w-full md:w-[240px] shrink-0 space-y-6">
            {families.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-2">Word Family</p>
                <div className="flex flex-col gap-1.5">
                  {families.map(f => <span key={f} className="text-[12px] text-[#555] dark:text-[#aaa] bg-[#fafafa] dark:bg-[#1a1a1a] px-2.5 py-1.5 rounded-[6px] border border-[#f0f0f0] dark:border-[#222]">{f}</span>)}
                </div>
              </div>
            )}
            
            {synonyms.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-2">Đồng nghĩa</p>
                <div className="flex flex-wrap gap-1.5">
                  {synonyms.map(s => <Chip key={s} label={s} bg="hsl(160,84%,42%,0.08)" text="hsl(160,84%,28%)" />)}
                </div>
              </div>
            )}
            
            {antonyms.length > 0 && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb] mb-2">Trái nghĩa</p>
                <div className="flex flex-wrap gap-1.5">
                  {antonyms.map(a => <Chip key={a} label={a} bg="hsl(0,84%,60%,0.08)" text="hsl(0,72%,42%)" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Table view ─────────────────────────────────────────────────── */
const TABLE_PAGE = 15

function TableView({ words, selected, onToggle, onToggleAll, onEdit, onDelete, onView }: {
  words: VocabWord[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onEdit: (w: VocabWord) => void;
  onDelete: (id: string) => void;
  onView: (w: VocabWord) => void;
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(words.length / TABLE_PAGE))
  const paged      = words.slice((page - 1) * TABLE_PAGE, page * TABLE_PAGE)
  const pagedIds    = paged.map(w => w.id)
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selected.has(id))

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-[#fafafa] dark:bg-[#1a1a1a]" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={e => onToggleAll(pagedIds, e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#171717] dark:accent-[#f5f5f5] cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] w-[14%]">Từ / Cụm từ</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] w-[8%]">Loại từ</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] w-[10%]">Phiên âm</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">Định nghĩa VI</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">Định nghĩa EN</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">Ví dụ 1</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map(w => {
              const ts = typeStyle(w.type)
              const isSelected = selected.has(w.id)
              return (
                <tr key={w.id} className={cn('group transition-colors cursor-pointer', isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-[#fafafa] dark:hover:bg-white/[0.02]')}
                  style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px 0px' }}
                  onClick={() => onView(w)}>
                  {/* Checkbox */}
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(w.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-3.5 h-3.5 accent-[#171717] dark:accent-[#f5f5f5] cursor-pointer"
                    />
                  </td>
                  {/* Word */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[#0072f5] transition-colors truncate">{w.word}</span>
                      <button onClick={(e) => { e.stopPropagation(); speak(w.word); }} className="opacity-0 group-hover:opacity-100 text-[#ccc] hover:text-[#888] transition-all cursor-pointer shrink-0"><Volume2 className="h-3 w-3" /></button>
                    </div>
                    {w.samplePhrase && <p className="text-[11px] text-[#bbb] italic truncate mt-0.5">{w.samplePhrase}</p>}
                  </td>
                  {/* Type */}
                  <td className="px-4 py-3">
                    {w.type && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: ts.bg, color: ts.text }}>{w.type}</span>}
                  </td>
                  {/* Pronunciation */}
                  <td className="px-4 py-3">
                    {w.pronunciation && <span className="font-mono text-[12px] text-[#888] truncate block">{w.pronunciation}</span>}
                  </td>
                  {/* Def VI */}
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-[#444] dark:text-[#bbb] truncate">{w.definitionVi}</p>
                  </td>
                  {/* Def EN */}
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-[#666] dark:text-[#888] italic truncate">{w.definitionEn}</p>
                  </td>
                  {/* Example */}
                  <td className="px-4 py-3">
                    <p className="text-[12px] text-[#aaa] truncate">{w.example1En}</p>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onEdit(w); }} className="rounded-[6px] p-1.5 text-[#999] hover:bg-[#fafafa] hover:text-[#171717] dark:hover:bg-white/8 dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(w.id); }} className="rounded-[6px] p-1.5 text-[#999] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center px-6 py-3" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 -1px 0 0' }}>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={cn('flex h-7 w-7 items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer', page === i + 1 ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]' : 'text-[#666] hover:bg-[#fafafa] dark:hover:bg-white/5')}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
const PAGE_SIZE = 15

export default function VocabTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params)
  const router      = useRouter()

  const [topic, setTopic]   = useState<VocabTopic | null>(null)
  const [words, setWords]   = useState<VocabWord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'flashcard'>('table')

  const [modal, setModal]               = useState<'add' | VocabWord | null>(null)
  const [viewWord, setViewWord]         = useState<VocabWord | null>(null)
  const [showAiFill, setShowAiFill]     = useState(false)
  const [showPasteImport, setShowPasteImport] = useState(false)
  const [selected, setSelected]               = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting]       = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/vocab/topics/${topicId}`).then(r => r.json()),
      fetch(`/api/vocab/words?topic_id=${topicId}`).then(r => r.json()),
    ]).then(([t, w]) => { setTopic(t.data); setWords(w.data ?? []) })
      .catch(() => toast.error('Không thể tải dữ liệu'))
      .finally(() => setLoading(false))
  }, [topicId])

  // Keyboard nav for flashcard
  useEffect(() => {
    if (viewMode !== 'flashcard') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setWords(w => w) // let FlashcardView handle via ref
      if (e.key === 'ArrowRight') setWords(w => w)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [viewMode])

  const filtered = useMemo(() =>
    words.filter(w => !search || w.word.toLowerCase().includes(search.toLowerCase()) || w.definitionVi?.toLowerCase().includes(search.toLowerCase())),
  [words, search])

  function handleSaved(w: VocabWord) {
    setWords(prev => { const idx = prev.findIndex(x => x.id === w.id); return idx >= 0 ? prev.map(x => x.id === w.id ? w : x) : [w, ...prev] })
    setModal(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa từ này?')) return
    try {
      await fetch(`/api/vocab/words/${id}`, { method: 'DELETE' })
      setWords(prev => prev.filter(w => w.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
      toast.success('Đã xóa từ')
    } catch { toast.error('Xóa thất bại') }
  }

  /* Bulk delete */
  async function handleBulkDelete() {
    if (selected.size === 0) return
    const count = selected.size
    if (!confirm(`Xóa ${count} từ đã chọn? Không thể hoàn tác.`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(
        Array.from(selected).map(id =>
          fetch(`/api/vocab/words/${id}`, { method: 'DELETE' })
        )
      )
      setWords(prev => prev.filter(w => !selected.has(w.id)))
      setSelected(new Set())
      toast.success(`Đã xóa ${count} từ.`)
    } catch { toast.error('Xóa hàng loạt thất bại.') }
    finally { setBulkDeleting(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function toggleSelectAll(ids: string[], checked: boolean) {
    setSelected(prev => {
      const n = new Set(prev)
      for (const id of ids) { if (checked) n.add(id); else n.delete(id) }
      return n
    })
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#999]" /></div>

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-4">

      {/* ── Back ── */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[12px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer">
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
      </button>

      {/* ── Main card (Vercel-style) ── */}
      <div className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
          {/* Left: topic info */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[24px] shrink-0">{topic?.icon ?? '📖'}</span>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5] truncate">{topic?.name}</h1>
            </div>
          </div>

          {/* Right: search + view toggle + actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Search */}
            <div className="relative hidden md:block mr-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Tìm từ..."
                className="pl-9 pr-3 h-8 w-52 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
                style={{ boxShadow: 'var(--shadow-border)' }} />
            </div>

            {/* View toggle — icon only */}
            <div className="flex items-center rounded-[6px] overflow-hidden" style={{ boxShadow: 'var(--shadow-border)' }}>
              <Tip label="Bảng">
                <button onClick={() => setViewMode('table')}
                  className={cn('flex h-8 w-8 items-center justify-center text-[12px] transition-colors cursor-pointer', viewMode === 'table' ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]' : 'text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]')}>
                  <Table2 className="h-3.5 w-3.5" />
                </button>
              </Tip>
              <Tip label="Flashcard">
                <button onClick={() => setViewMode('flashcard')}
                  className={cn('flex h-8 w-8 items-center justify-center text-[12px] transition-colors cursor-pointer', viewMode === 'flashcard' ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]' : 'text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]')}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </Tip>
            </div>

            {/* Learn */}
            {words.length > 0 && (
              <Tip label="Học ngay">
                <Link href={`/vocab/learn?topic_id=${topicId}`}
                  className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  <GraduationCap className="h-3.5 w-3.5" />
                </Link>
              </Tip>
            )}

            {/* AI Fill */}
            <Tip label="AI Fill">
              <button onClick={() => setShowAiFill(true)}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: 'hsl(271,91%,65%,0.10)', color: 'hsl(271,71%,50%)', boxShadow: 'var(--shadow-border)' }}>
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </Tip>

            {/* Import */}
            <Tip label="Import">
              <button onClick={() => setShowPasteImport(true)}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] cursor-pointer text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
                style={{ boxShadow: 'var(--shadow-border)' }}>
                <ClipboardList className="h-3.5 w-3.5" />
              </button>
            </Tip>

            {/* Add */}
            <Tip label="Thêm từ">
              <button onClick={() => setModal('add')}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </Tip>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 py-2" style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px 0px' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm từ..."
              className="pl-9 pr-3 h-8 w-full text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
              style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            {search ? (
              <>
                <Search className="h-8 w-8 text-[#ddd] mb-3" />
                <p className="text-[14px] text-[#666]">Không tìm thấy &ldquo;{search}&rdquo;</p>
              </>
            ) : (
              <>
                <p className="text-[14px] font-medium text-[#666] dark:text-[#888]">Chưa có từ nào</p>
                <p className="text-[12px] text-[#bbb] mt-1">Nhấn &ldquo;Thêm từ&rdquo; hoặc dùng &ldquo;AI Fill&rdquo; để bắt đầu.</p>
              </>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <TableView words={filtered} selected={selected}
                onToggle={toggleSelect} onToggleAll={toggleSelectAll}
                onEdit={setModal} onDelete={handleDelete} onView={setViewWord} />
            </div>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-[#f0f0f0] dark:divide-[#1f1f1f]">
              {filtered.map(w => {
                const ts = typeStyle(w.type)
                return (
                  <div key={w.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors"
                    onClick={() => setViewWord(w)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{w.word}</span>
                        {w.type && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{ background: ts.bg, color: ts.text }}>{w.type}</span>}
                      </div>
                      {w.definitionVi && <p className="text-[12px] text-[#888] truncate mt-0.5">{w.definitionVi}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); speak(w.word) }}
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#ccc] hover:text-[#888] transition-colors cursor-pointer">
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setModal(w) }}
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#ccc] hover:text-[#666] transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <FlashcardView words={filtered} />
        )}
      </div>

      {/* Bulk delete floating bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 h-11 px-5 rounded-full bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}>
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span className="text-[13px] font-medium">{selected.size} đã chọn</span>
          <div className="w-px h-5 bg-white/20 dark:bg-black/10" />
          <button onClick={() => setSelected(new Set())}
            className="text-[12px] text-white/70 dark:text-black/50 hover:text-white dark:hover:text-black transition-colors cursor-pointer">
            Bỏ chọn
          </button>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 text-[12px] font-medium text-red-400 dark:text-red-500 hover:text-red-300 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50">
            {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Xóa
          </button>
        </div>
      )}

      {/* Modals */}
      {viewWord && (
        <WordDetailModal
          word={viewWord}
          onClose={() => setViewWord(null)}
          onEdit={() => { setModal(viewWord); setViewWord(null); }}
          onDelete={() => { handleDelete(viewWord.id); setViewWord(null); }}
        />
      )}
      {modal && (
        <WordFormModal topicId={topicId} initial={modal === 'add' ? undefined : modal}
          onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {showAiFill && (
        <AiFillModal topicId={topicId} onClose={() => setShowAiFill(false)}
          onSaved={saved => { setWords(prev => [...saved, ...prev]); setShowAiFill(false) }} />
      )}
      {showPasteImport && (
        <PasteImportModal topicId={topicId} onClose={() => setShowPasteImport(false)}
          onSaved={saved => { setWords(prev => [...saved, ...prev]); setShowPasteImport(false) }} />
      )}
    </div>
  )
}
