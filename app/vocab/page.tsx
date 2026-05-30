'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookA, Plus, Loader2, X, Check, Search,
  ArrowRight, ChevronLeft, ChevronRight, Trash2,
  Globe, Code, Music, Video, Image, FileText, Database, Cloud,
  ShoppingBag, Gamepad2, GraduationCap, Heart, Star, Rocket, Zap,
  Coffee, Briefcase, Palette, Newspaper, Link as LinkIcon, BookOpen,
  Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Home, Settings, Users, TrendingUp, BarChart3,
  Wrench, Cpu, Smartphone, Monitor, Wifi, Lock, Dumbbell, Plane,
  Utensils, FlaskConical, Hash, Landmark, Scale, Wallet, PenLine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Tip } from '@/components/ui/tip'

interface VocabTopic {
  id:            string
  name:          string
  slug:          string
  icon:          string
  sortOrder:     number
  createdAt:     string
  word_count:    number
  learned_count: number
}

/* ─── Lucide icon registry — synced with Sidebar ICON_MAP ───────── */
const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Globe, Code, Music, Video, Image, FileText, Database, Cloud,
  ShoppingBag, Gamepad2, GraduationCap, Heart, Star, Rocket, Zap,
  Coffee, Briefcase, Palette, Newspaper, Link: LinkIcon, BookOpen,
  Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Home, Settings, Users, TrendingUp, BarChart3,
  Wrench, Cpu, Smartphone, Monitor, Wifi, Lock, Dumbbell, Plane,
  Utensils, FlaskConical, Hash, Landmark, Scale, Wallet, BookA, PenLine,
}

/* Ordered list for the picker grid */
const ICON_PICKER_LIST: Array<{ name: string; label: string }> = [
  { name: 'BookA',        label: 'Book' },
  { name: 'BookOpen',     label: 'Reading' },
  { name: 'Globe',        label: 'Global' },
  { name: 'Briefcase',    label: 'Business' },
  { name: 'Plane',        label: 'Travel' },
  { name: 'Utensils',     label: 'Food' },
  { name: 'Code',         label: 'Tech' },
  { name: 'Headphones',   label: 'Listen' },
  { name: 'Dumbbell',     label: 'Sport' },
  { name: 'Music',        label: 'Music' },
  { name: 'Palette',      label: 'Art' },
  { name: 'FlaskConical', label: 'Science' },
  { name: 'Hash',         label: 'Math' },
  { name: 'Landmark',     label: 'History' },
  { name: 'Scale',        label: 'Law' },
  { name: 'Wallet',       label: 'Finance' },
  { name: 'GraduationCap', label: 'Edu' },
  { name: 'Home',         label: 'Family' },
  { name: 'Heart',        label: 'Emotion' },
  { name: 'MessageCircle', label: 'Idiom' },
  { name: 'PenLine',      label: 'Academic' },
  { name: 'Newspaper',    label: 'News' },
  { name: 'Users',        label: 'HR' },
  { name: 'Shield',       label: 'Security' },
  { name: 'Cpu',          label: 'Hardware' },
  { name: 'Cloud',        label: 'Cloud' },
  { name: 'Database',     label: 'Data' },
  { name: 'Terminal',     label: 'CLI' },
  { name: 'Smartphone',   label: 'Mobile' },
  { name: 'Camera',       label: 'Photo' },
  { name: 'Video',        label: 'Video' },
  { name: 'Image',        label: 'Image' },
  { name: 'Mail',         label: 'Email' },
  { name: 'Calculator',   label: 'Calc' },
  { name: 'Map',          label: 'Map' },
  { name: 'Star',         label: 'Star' },
  { name: 'Rocket',       label: 'Launch' },
  { name: 'Zap',          label: 'Fast' },
  { name: 'TrendingUp',   label: 'Growth' },
  { name: 'BarChart3',    label: 'Analytics' },
  { name: 'Coffee',       label: 'Coffee' },
  { name: 'ShoppingBag',  label: 'Shop' },
  { name: 'Gamepad2',     label: 'Game' },
  { name: 'Wifi',         label: 'Network' },
  { name: 'Lock',         label: 'Security' },
  { name: 'Wrench',       label: 'Tools' },
  { name: 'Monitor',      label: 'Screen' },
  { name: 'FileText',     label: 'Docs' },
]

/* ─── Keyword → icon name mapping (synced with Sidebar icons) ───── */
const SUGGEST_MAP: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['business', 'work', 'office', 'corporate', 'kinh doanh', 'công việc'], icon: 'Briefcase' },
  { keywords: ['travel', 'trip', 'vacation', 'du lịch', 'đi lại'],                   icon: 'Plane' },
  { keywords: ['food', 'eat', 'cook', 'kitchen', 'ăn', 'nấu', 'đồ ăn', 'cuisine'],  icon: 'Utensils' },
  { keywords: ['tech', 'technology', 'it', 'computer', 'code', 'software', 'programming'], icon: 'Code' },
  { keywords: ['health', 'medical', 'body', 'sức khỏe', 'y tế', 'cơ thể'],          icon: 'Heart' },
  { keywords: ['nature', 'environment', 'climate', 'eco', 'thiên nhiên', 'môi trường'], icon: 'Globe' },
  { keywords: ['sport', 'fitness', 'gym', 'exercise', 'thể thao', 'vận động'],      icon: 'Dumbbell' },
  { keywords: ['music', 'song', 'âm nhạc', 'bài hát'],                               icon: 'Music' },
  { keywords: ['art', 'design', 'draw', 'nghệ thuật', 'thiết kế'],                   icon: 'Palette' },
  { keywords: ['science', 'physics', 'chemistry', 'khoa học', 'vật lý', 'hóa học'], icon: 'FlaskConical' },
  { keywords: ['math', 'number', 'toán', 'số học'],                                   icon: 'Hash' },
  { keywords: ['history', 'culture', 'lịch sử', 'văn hóa'],                          icon: 'Landmark' },
  { keywords: ['law', 'legal', 'pháp luật', 'luật'],                                  icon: 'Scale' },
  { keywords: ['finance', 'money', 'bank', 'tài chính', 'tiền', 'ngân hàng'],        icon: 'Wallet' },
  { keywords: ['education', 'school', 'học', 'trường', 'giáo dục'],                  icon: 'GraduationCap' },
  { keywords: ['family', 'home', 'house', 'gia đình', 'nhà'],                        icon: 'Home' },
  { keywords: ['emotion', 'feeling', 'cảm xúc', 'tình cảm'],                         icon: 'Heart' },
  { keywords: ['animal', 'pet', 'động vật', 'thú cưng'],                              icon: 'Star' },
  { keywords: ['daily', 'routine', 'everyday', 'hàng ngày', 'thường ngày'],          icon: 'BookOpen' },
  { keywords: ['idiom', 'phrase', 'expression', 'thành ngữ', 'cụm từ'],              icon: 'MessageCircle' },
  { keywords: ['academic', 'ielts', 'toeic', 'toefl', 'gre', 'sat'],                 icon: 'PenLine' },
  { keywords: ['news', 'media', 'politics', 'tin tức', 'chính trị', 'báo'],          icon: 'Newspaper' },
  { keywords: ['recruitment', 'hr', 'hiring', 'tuyển dụng', 'nhân sự'],              icon: 'Users' },
  { keywords: ['security', 'password', 'bảo mật', 'an toàn'],                        icon: 'Shield' },
  { keywords: ['data', 'database', 'sql', 'dữ liệu'],                                icon: 'Database' },
  { keywords: ['cloud', 'server', 'hosting', 'aws', 'azure'],                        icon: 'Cloud' },
  { keywords: ['mobile', 'app', 'android', 'ios', 'điện thoại'],                     icon: 'Smartphone' },
  { keywords: ['game', 'gaming', 'trò chơi'],                                         icon: 'Gamepad2' },
  { keywords: ['shopping', 'ecommerce', 'mua sắm'],                                   icon: 'ShoppingBag' },
]
const DEFAULT_ICON = 'BookA'

function suggestIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const e of SUGGEST_MAP) {
    if (e.keywords.some(k => lower.includes(k))) return e.icon
  }
  return DEFAULT_ICON
}

/** Resolve icon name → Lucide component, fallback to BookA */
function resolveIcon(name: string): LucideIcon {
  return LUCIDE_ICONS[name] ?? BookA
}

/* ─── New Topic Modal ───────────────────────────────────────────── */
function NewTopicModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: VocabTopic) => void }) {
  const [name, setName]             = useState('')
  const [slug, setSlug]             = useState('')
  const [icon, setIcon]             = useState(DEFAULT_ICON)
  const [iconEdited, setIconEdited] = useState(false)
  const [loading, setLoading]       = useState(false)

  function handleNameChange(v: string) {
    setName(v)
    setSlug(v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    // Auto-suggest icon only when user hasn't manually picked one
    if (!iconEdited) setIcon(suggestIcon(v))
  }

  async function handleSubmit() {
    if (!name.trim() || !slug.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/vocab/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), slug, icon }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)
      toast.success(`Đã tạo chủ đề "${name}"`)
      onCreated(json.data)
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Tạo chủ đề thất bại') }
    finally { setLoading(false) }
  }

  const SelectedIcon = resolveIcon(icon)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-[10px] bg-white dark:bg-[#111] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Tạo chủ đề mới</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
        <div className="space-y-3">
          {/* Name input — drives icon auto-suggest */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5">Tên chủ đề</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="VD: Business English"
              className="w-full h-9 px-3 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
              style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
          {/* Slug */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5">Slug</label>
            <input value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="business-english"
              className="w-full h-9 px-3 text-[13px] font-mono rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
              style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
          {/* Icon picker — synced with Sidebar ICON_MAP */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Icon</label>
              {/* Active icon preview */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] bg-[#f5f5f5] dark:bg-[#1a1a1a]">
                <SelectedIcon className="h-3.5 w-3.5 text-[hsl(239,84%,67%)]" />
                <span className="text-[11px] text-[#666] dark:text-[#888] font-mono">{icon}</span>
              </div>
            </div>
            {/* Grid picker */}
            <div
              className="grid gap-1 p-2 rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] overflow-y-auto"
              style={{ gridTemplateColumns: 'repeat(8, 1fr)', maxHeight: 168, boxShadow: 'var(--shadow-border)' }}
            >
              {ICON_PICKER_LIST.map(({ name: iconName, label }) => {
                const Icon = resolveIcon(iconName)
                const isSelected = icon === iconName
                return (
                  <Tip key={iconName} label={label}>
                    <button
                      type="button"
                      onClick={() => { setIcon(iconName); setIconEdited(true) }}
                      className={cn(
                        'flex items-center justify-center w-full aspect-square rounded-[5px] transition-all duration-100 cursor-pointer',
                        isSelected
                          ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                          : 'text-[#999] hover:bg-white dark:hover:bg-[#272727] hover:text-[#444] dark:hover:text-[#ccc]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  </Tip>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-9 rounded-[6px] text-[13px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: 'var(--shadow-border)' }}>Hủy</button>
          <button onClick={handleSubmit} disabled={loading || !name.trim()}
            className="flex-1 h-9 rounded-[6px] text-[13px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Tạo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
const PAGE_SIZE = 15

export default function VocabPage() {
  const router = useRouter()
  const [topics, setTopics]     = useState<VocabTopic[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vocab/topics')
      .then(r => r.json())
      .then(j => setTopics(j.data ?? []))
      .catch(() => toast.error('Không thể tải danh sách chủ đề'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    topics.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase())),
  [topics, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleCreated(t: VocabTopic) {
    setTopics(prev => [...prev, { ...t, word_count: 0, learned_count: 0 }])
    setShowModal(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Xóa chủ đề này? Tất cả từ bên trong cũng sẽ bị xóa.')) return
    setDeleting(id)
    try {
      await fetch(`/api/vocab/topics/${id}`, { method: 'DELETE' })
      setTopics(prev => prev.filter(t => t.id !== id))
      toast.success('Đã xóa chủ đề')
    } catch { toast.error('Xóa thất bại') }
    finally { setDeleting(null) }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-4">

      {/* ── Main card ── */}
      <div className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-4" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">Danh sách chủ đề</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999]" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm chủ đề..."
                className="pl-9 pr-3 h-8 w-64 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
                style={{ boxShadow: 'var(--shadow-border)' }} />
            </div>
            <Tip label="Thêm chủ đề">
              <button onClick={() => setShowModal(true)}
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
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Tìm chủ đề..."
              className="pl-9 pr-3 h-8 w-full text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none placeholder:text-[#bbb]"
              style={{ boxShadow: 'var(--shadow-border)' }} />
          </div>
        </div>

        {/* ── Desktop table ── */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-[#999]" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            {search ? (
              <><Search className="h-8 w-8 text-[#ddd] mb-3" /><p className="text-[14px] text-[#666]">Không tìm thấy &ldquo;{search}&rdquo;</p></>
            ) : (
              <><BookA className="h-10 w-10 text-[#ddd] mb-3" /><p className="text-[14px] font-medium text-[#666] dark:text-[#888]">Chưa có chủ đề nào</p><p className="text-[12px] text-[#bbb] mt-1">Nhấn &ldquo;Thêm chủ đề&rdquo; để bắt đầu.</p></>
            )}
          </div>
        ) : (
          <>
            {/* Table — desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#fafafa] dark:bg-[#1a1a1a]" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
                    {['', 'Chủ đề', 'Slug', 'Số từ', 'Tiến độ', ''].map((h, i) => (
                      <th key={i} className={cn('px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]', i === 0 && 'w-12', i === 5 && 'w-24 text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(t => {
                    const pct = t.word_count > 0 ? Math.round((t.learned_count / t.word_count) * 100) : 0
                    return (
                      <tr key={t.id}
                        className="group cursor-pointer transition-colors hover:bg-[#fafafa] dark:hover:bg-white/[0.02]"
                        style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px 0px' }}
                        onClick={() => router.push(`/vocab/${t.id}`)}>
                        {/* Icon */}
                        <td className="px-4 py-3.5">
                          {(() => { const I = resolveIcon(t.icon ?? DEFAULT_ICON); return <I className="h-5 w-5 text-[#666] dark:text-[#888]" /> })()
                          }
                        </td>
                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[#0072f5] transition-colors">{t.name}</p>
                        </td>
                        {/* Slug */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[12px] text-[#aaa]">{t.slug}</span>
                        </td>
                        {/* Word count */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-medium tabular-nums px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#666] dark:text-[#888]">
                            {t.word_count} từ
                          </span>
                        </td>
                        {/* Progress */}
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#222] overflow-hidden">
                              <div className="h-full rounded-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className={cn('text-[11px] tabular-nums font-medium shrink-0', pct >= 100 ? 'text-emerald-500' : 'text-[#bbb]')}>
                              {pct >= 100 ? '🎖️ Mastered' : `${t.learned_count}/${t.word_count}`}
                            </span>
                          </div>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tip label="Xem">
                              <button onClick={() => router.push(`/vocab/${t.id}`)}
                                className="rounded-[6px] p-1.5 text-[#999] hover:bg-[#f0f7ff] hover:text-[#0072f5] dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </Tip>
                            <Tip label="Xóa">
                              <button onClick={e => handleDelete(t.id, e)} disabled={deleting === t.id}
                                className="rounded-[6px] p-1.5 text-[#999] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors cursor-pointer disabled:opacity-40">
                                {deleting === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </Tip>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden divide-y divide-[#f0f0f0] dark:divide-[#1a1a1a]">
              {paginated.map(t => {
                const pct = t.word_count > 0 ? Math.round((t.learned_count / t.word_count) * 100) : 0
                return (
                  <div key={t.id} onClick={() => router.push(`/vocab/${t.id}`)}
                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[#fafafa] dark:hover:bg-white/[0.02] transition-colors">
                    {(() => { const I = resolveIcon(t.icon ?? DEFAULT_ICON); return <I className="h-5 w-5 shrink-0 text-[#666] dark:text-[#888]" /> })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-[#f0f0f0] dark:bg-[#222]">
                          <div className="h-full rounded-full bg-[#171717] dark:bg-[#f5f5f5]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-[#bbb] tabular-nums shrink-0">{t.learned_count}/{t.word_count}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#ccc] shrink-0" />
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center px-6 py-3" style={{ boxShadow: 'rgba(0,0,0,0.06) 0 -1px 0 0' }}>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={cn('flex h-7 w-7 items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer',
                        currentPage === i + 1 ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]' : 'text-[#666] hover:bg-[#fafafa] dark:hover:bg-white/5')}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && <NewTopicModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  )
}
