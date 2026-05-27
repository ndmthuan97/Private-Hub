'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Globe, Code, Music, Video, Image, FileText, Database, Cloud, ShoppingBag, Gamepad2,
  GraduationCap, Heart, Star, Rocket, Zap, Coffee, Briefcase, Palette, Newspaper,
  Link as LinkIcon, BookOpen, Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Search, Home, Settings, Users, TrendingUp, BarChart3, Wrench, Cpu,
  Smartphone, Monitor, Wifi, Lock, Trash2, Pencil, Check, X, FolderOpen, ExternalLink,
  RefreshCw, Loader2, Sun, Moon, Eye, EyeOff, LayoutDashboard, Wallet, CalendarDays,
  BookA, Plus, FolderPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ─── Shared types & constants ───────────────────────────────── */
type ExternalItem = { href: string; label: string; color: string; icon: string; groupId?: string }
type CustomGroup = { id: string; label: string }

const LINKS_KEY = 'ph_external_links'
const GROUPS_KEY = 'ph_custom_groups'
const HIDDEN_KEY = 'ph_hidden_items'
const GROUP_OVERRIDES_KEY = 'ph_group_overrides'
const BUILTIN_PREFIX = '__builtin:'

type GroupOverride = { customLabel?: string; hidden?: boolean }
type GroupOverrides = Record<string, GroupOverride>

// Notify sidebar (same tab) about localStorage changes
function notifySidebar() { window.dispatchEvent(new Event('ph_storage_sync')) }

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Code, Music, Video, Image, FileText, Database, Cloud, ShoppingBag, Gamepad2,
  GraduationCap, Heart, Star, Rocket, Zap, Coffee, Briefcase, Palette, Newspaper,
  Link: LinkIcon, BookOpen, Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Search, Home, Settings, Users, TrendingUp, BarChart3, Wrench, Cpu,
  Smartphone, Monitor, Wifi, Lock,
}
const ICON_NAMES = Object.keys(ICON_MAP)

function resolveIcon(name?: string): LucideIcon { return (name && ICON_MAP[name]) || Globe }
function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

type BuiltInItem = { href: string; label: string; icon: LucideIcon; color: string; group: string }
const BUILT_IN_ITEMS: BuiltInItem[] = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard, color: '#666', group: 'Chung' },
  { href: '/conversation', label: 'Luyện Giao Tiếp', icon: MessageCircle, color: 'hsl(160,84%,42%)', group: 'Học tập' },
  { href: '/vocab', label: 'Từ Vựng', icon: BookA, color: 'hsl(239,84%,67%)', group: 'Học tập' },
  { href: '/dictation', label: 'Daily Dictation', icon: Headphones, color: 'hsl(160,84%,42%)', group: 'Học tập' },
  { href: '/budget', label: 'Ngân Sách', icon: Wallet, color: 'hsl(38,92%,52%)', group: 'Quản lý' },
  { href: '/strategy', label: 'Strategy', icon: Map, color: 'hsl(262,83%,58%)', group: 'Quản lý' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, color: 'hsl(217,91%,60%)', group: 'Quản lý' },
  { href: '/notebooklm', label: 'NotebookLM', icon: BookOpen, color: 'hsl(217,91%,60%)', group: 'Công cụ' },
]
const BUILT_IN_GROUPS = [...new Set(BUILT_IN_ITEMS.map(i => i.group))]

/* ─── Settings Page ──────────────────────────────────────────── */
export default function SettingsPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [links, setLinks] = useState<ExternalItem[]>([])
  const [groups, setGroups] = useState<CustomGroup[]>([])
  const [hiddenItems, setHiddenItems] = useState<string[]>([])
  const [groupOverrides, setGroupOverrides] = useState<GroupOverrides>({})

  // Edit link
  const [editingLink, setEditingLink] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editGroupId, setEditGroupId] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null)

  // Edit group
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState('')

  // Edit default group label
  const [editingDefaultGroup, setEditingDefaultGroup] = useState<string | null>(null)
  const [editDefaultGroupLabel, setEditDefaultGroupLabel] = useState('')

  // Add new
  const [addPageOpen, setAddPageOpen] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [savingIcon, setSavingIcon] = useState(false)

  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const [refreshingIcon, setRefreshingIcon] = useState<string | null>(null)

  const urlRef = useRef<HTMLInputElement>(null)
  const groupNameRef = useRef<HTMLInputElement>(null)

  /* ── Init ──────────────────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem('ph_theme') as 'dark' | 'light' | null
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(saved ?? system)
    try { const r = localStorage.getItem(LINKS_KEY); if (r) setLinks(JSON.parse(r).map((i: ExternalItem) => ({ ...i, icon: i.icon || 'Globe' }))); } catch {}
    try { const r = localStorage.getItem(GROUPS_KEY); if (r) setGroups(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem(HIDDEN_KEY); if (r) setHiddenItems(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem(GROUP_OVERRIDES_KEY); if (r) setGroupOverrides(JSON.parse(r)); } catch {}
  }, [])

  useEffect(() => { if (addPageOpen) setTimeout(() => urlRef.current?.focus(), 50) }, [addPageOpen])
  useEffect(() => { if (addGroupOpen) setTimeout(() => groupNameRef.current?.focus(), 50) }, [addGroupOpen])

  /* ── Persist (+ notify sidebar) ─────────────────────────────── */
  function persistLinks(next: ExternalItem[]) { setLinks(next); localStorage.setItem(LINKS_KEY, JSON.stringify(next)); notifySidebar() }
  function persistGroups(next: CustomGroup[]) { setGroups(next); localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); notifySidebar() }
  function persistHidden(next: string[]) { setHiddenItems(next); localStorage.setItem(HIDDEN_KEY, JSON.stringify(next)); notifySidebar() }
  function persistGroupOverrides(next: GroupOverrides) { setGroupOverrides(next); localStorage.setItem(GROUP_OVERRIDES_KEY, JSON.stringify(next)); notifySidebar() }
  function applyTheme(t: 'dark' | 'light') { setTheme(t); localStorage.setItem('ph_theme', t); document.documentElement.setAttribute('data-theme', t); notifySidebar() }

  /* ── Built-in visibility ───────────────────────────────────── */
  function toggleBuiltIn(href: string) {
    persistHidden(hiddenItems.includes(href) ? hiddenItems.filter(h => h !== href) : [...hiddenItems, href])
  }
  function toggleDefaultGroup(groupName: string) {
    const cur = groupOverrides[groupName] || {}
    persistGroupOverrides({ ...groupOverrides, [groupName]: { ...cur, hidden: !cur.hidden } })
  }
  function startEditDefaultGroup(groupName: string) {
    setEditingDefaultGroup(groupName)
    setEditDefaultGroupLabel(groupOverrides[groupName]?.customLabel || groupName)
  }
  function saveEditDefaultGroup(groupName: string) {
    const label = editDefaultGroupLabel.trim()
    if (!label) return
    const cur = groupOverrides[groupName] || {}
    // If user sets the label back to original, remove the override
    const customLabel = label === groupName ? undefined : label
    persistGroupOverrides({ ...groupOverrides, [groupName]: { ...cur, customLabel } })
    setEditingDefaultGroup(null)
    toast.success('Đã đổi tên nhóm')
  }

  /* ── Link actions ──────────────────────────────────────────── */
  function startEditLink(item: ExternalItem) {
    setEditingLink(item.href); setEditLabel(item.label); setEditGroupId(item.groupId || ''); setEditIcon(item.icon); setShowIconPicker(null)
  }
  function saveEditLink(href: string) {
    persistLinks(links.map(l => l.href === href ? { ...l, label: editLabel.trim() || l.label, groupId: editGroupId || undefined, icon: editIcon || l.icon } : l))
    setEditingLink(null); toast.success('Đã cập nhật')
  }
  function deleteLink(href: string) { persistLinks(links.filter(l => l.href !== href)); toast.success('Đã xóa trang') }

  async function refreshIcon(item: ExternalItem) {
    setRefreshingIcon(item.href)
    try {
      const res = await fetch('/api/suggest-icon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: item.href, label: item.label }) })
      const json = await res.json()
      if (json.data?.icon) { persistLinks(links.map(l => l.href === item.href ? { ...l, icon: json.data.icon } : l)); toast.success(`Icon → ${json.data.icon}`) }
    } catch { toast.error('Không thể gợi ý icon') }
    setRefreshingIcon(null)
  }

  async function handleAddPage() {
    const url = newUrl.trim(); if (!url) return
    const full = url.startsWith('http') ? url : `https://${url}`
    const label = newLabel.trim() || (() => { try { return new URL(full).hostname.replace('www.', '') } catch { return full } })()
    setSavingIcon(true)
    let icon = 'Globe'
    try { const res = await fetch('/api/suggest-icon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: full, label }) }); const j = await res.json(); if (j.data?.icon) icon = j.data.icon } catch {}
    setSavingIcon(false)
    persistLinks([...links, { href: full, label, color: 'hsl(217,91%,60%)', icon, groupId: newGroupId || undefined }])
    setNewUrl(''); setNewLabel(''); setNewGroupId(''); setAddPageOpen(false)
    toast.success(`Đã thêm "${label}"`)
  }

  /* ── Group actions ─────────────────────────────────────────── */
  function startEditGroup(g: CustomGroup) { setEditingGroup(g.id); setEditGroupName(g.label) }
  function saveEditGroup(id: string) {
    const name = editGroupName.trim(); if (!name) return
    persistGroups(groups.map(g => g.id === id ? { ...g, label: name } : g)); setEditingGroup(null); toast.success('Đã đổi tên nhóm')
  }
  function deleteGroup(id: string) {
    persistLinks(links.map(l => l.groupId === id ? { ...l, groupId: undefined } : l))
    persistGroups(groups.filter(g => g.id !== id)); toast.success('Đã xóa nhóm')
  }
  function handleAddGroup() {
    const name = newGroupName.trim(); if (!name) return
    persistGroups([...groups, { id: generateId(), label: name }]); setNewGroupName(''); setAddGroupOpen(false); toast.success(`Đã tạo nhóm "${name}"`)
  }

  /* ── Helpers ───────────────────────────────────────────────── */
  function getGroupLabel(groupId?: string): string {
    if (!groupId) return 'Không nhóm'
    if (groupId.startsWith(BUILTIN_PREFIX)) return groupId.slice(BUILTIN_PREFIX.length)
    return groups.find(g => g.id === groupId)?.label ?? 'Không nhóm'
  }
  function toggleLinkVisibility(href: string) {
    persistHidden(hiddenItems.includes(href) ? hiddenItems.filter(h => h !== href) : [...hiddenItems, href])
  }
  const ungrouped = links.filter(l => !l.groupId)
  const grouped = (gid: string) => links.filter(l => l.groupId === gid)
  const builtinGrouped = (groupName: string) => links.filter(l => l.groupId === BUILTIN_PREFIX + groupName)

  /* ─── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Settings className="w-5 h-5 text-[#999]" />
          <div>
            <h1 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">Cài đặt</h1>
            <p className="text-[11px] text-[#999]">Giao diện, sidebar và trang đã thêm</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-10">

        {/* ═══ 1. APPEARANCE ═══════════════════════════════════ */}
        <section>
          <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] uppercase tracking-widest mb-4">Giao diện</h2>
          <div className="rounded-[10px] bg-white dark:bg-[#111] p-4" style={{ boxShadow: 'var(--shadow-border)' }}>
            <p className="text-[12px] text-[#999] mb-3">Chọn chế độ hiển thị</p>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {([['light', 'Sáng', 'Nền trắng', Sun, 'text-amber-500'] as const, ['dark', 'Tối', 'Nền đen', Moon, 'text-indigo-400'] as const]).map(([val, label, desc, Icon, iconColor]) => (
                <button key={val} onClick={() => applyTheme(val)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-[8px] transition-all cursor-pointer',
                    theme === val ? 'bg-[#f5f5f5] dark:bg-[#1a1a1a] ring-2 ring-[hsl(25,95%,53%)]' : 'hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'
                  )}
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  <div className="w-9 h-9 rounded-[6px] bg-[#f5f5f5] dark:bg-[#222] flex items-center justify-center">
                    <Icon className={cn('w-4 h-4', iconColor)} />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5]">{label}</p>
                    <p className="text-[10px] text-[#999]">{desc}</p>
                  </div>
                  {theme === val && <Check className="w-4 h-4 text-[hsl(25,95%,53%)] ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 2. DEFAULT ITEMS ════════════════════════════════ */}
        <section>
          <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] uppercase tracking-widest mb-1">Mục mặc định</h2>
          <p className="text-[11px] text-[#999] mb-4">Quản lý nhóm và các mục mặc định trên sidebar</p>
          <div className="space-y-4">
            {BUILT_IN_GROUPS.map(groupName => {
              const override = groupOverrides[groupName] || {}
              const isGroupHidden = !!override.hidden
              const displayLabel = override.customLabel || groupName
              const items = BUILT_IN_ITEMS.filter(i => i.group === groupName)
              return (
                <div key={groupName} className={cn('rounded-[10px] bg-white dark:bg-[#111] overflow-hidden transition-opacity', isGroupHidden && 'opacity-50')}
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  {/* Group header */}
                  <div className="group px-4 py-3 flex items-center gap-3" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
                    <FolderOpen className="w-4 h-4 shrink-0 text-[#bbb]" />
                    {editingDefaultGroup === groupName ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input autoFocus value={editDefaultGroupLabel} onChange={e => setEditDefaultGroupLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditDefaultGroup(groupName); if (e.key === 'Escape') setEditingDefaultGroup(null) }}
                          className="flex-1 h-7 px-2 text-[13px] rounded-[5px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                          style={{ boxShadow: 'var(--shadow-border)' }} />
                        <button onClick={() => saveEditDefaultGroup(groupName)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingDefaultGroup(null)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5]">
                            {displayLabel}
                            {override.customLabel && <span className="text-[10px] text-[#bbb] ml-1.5">({groupName})</span>}
                          </p>
                          <p className="text-[11px] text-[#999]">{items.length} mục</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditDefaultGroup(groupName)}
                            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" title="Đổi tên">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button onClick={() => toggleDefaultGroup(groupName)}
                          className={cn('flex h-7 px-2.5 items-center gap-1.5 rounded-[5px] text-[11px] font-medium transition-colors cursor-pointer',
                            isGroupHidden ? 'text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'
                              : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
                          )} style={{ boxShadow: 'var(--shadow-border)' }}>
                          {isGroupHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isGroupHidden ? 'Đang ẩn' : 'Hiện'}
                        </button>
                      </>
                    )}
                  </div>
                  {/* Items inside group */}
                  {!isGroupHidden && (
                    <div className="px-2 py-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {items.map(item => {
                          const Icon = item.icon; const isHidden = hiddenItems.includes(item.href)
                          return (
                            <div key={item.href} className={cn('rounded-[6px] px-3 py-2 flex items-center gap-2.5 transition-opacity', isHidden && 'opacity-40')}
                              style={{ background: isHidden ? undefined : 'var(--bg-base)' }}>
                              <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.color }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{item.label}</p>
                              </div>
                              <button onClick={() => toggleBuiltIn(item.href)}
                                className={cn('flex h-6 px-2 items-center gap-1 rounded-[4px] text-[10px] font-medium transition-colors cursor-pointer',
                                  isHidden ? 'text-[#ccc] hover:text-[#888]' : 'text-emerald-500'
                                )}>
                                {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          )
                        })}
                        {/* Custom links assigned to this built-in group */}
                        {builtinGrouped(groupName).map(item => {
                          const CIcon = resolveIcon(item.icon); const isHidden = hiddenItems.includes(item.href)
                          return (
                            <div key={item.href} className={cn('rounded-[6px] px-3 py-2 flex items-center gap-2.5 transition-opacity', isHidden && 'opacity-40')}
                              style={{ background: isHidden ? undefined : 'var(--bg-base)' }}>
                              <CIcon className="w-3.5 h-3.5 shrink-0 text-[#888]" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{item.label}</p>
                                <p className="text-[9px] text-[#bbb] truncate">{item.href}</p>
                              </div>
                              <button onClick={() => toggleLinkVisibility(item.href)}
                                className={cn('flex h-6 px-2 items-center gap-1 rounded-[4px] text-[10px] font-medium transition-colors cursor-pointer',
                                  isHidden ? 'text-[#ccc] hover:text-[#888]' : 'text-emerald-500'
                                )}>
                                {isHidden ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══ 3. CUSTOM GROUPS ════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] uppercase tracking-widest">Nhóm tùy chỉnh ({groups.length})</h2>
            <button onClick={() => setAddGroupOpen(true)}
              className="flex h-7 items-center gap-1.5 px-3 rounded-[5px] text-[11px] font-medium text-[#999] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <FolderPlus className="w-3 h-3" /> Thêm nhóm
            </button>
          </div>
          <p className="text-[11px] text-[#999] mb-4">Quản lý các nhóm bạn đã tạo trên sidebar</p>

          {addGroupOpen && (
            <div className="rounded-[10px] bg-white dark:bg-[#111] p-4 mb-3 flex items-center gap-2" style={{ boxShadow: 'var(--shadow-card)' }}>
              <FolderPlus className="w-4 h-4 text-[#bbb] shrink-0" />
              <input ref={groupNameRef} value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setAddGroupOpen(false) }}
                placeholder="Tên nhóm mới..." className="flex-1 h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                style={{ boxShadow: 'var(--shadow-border)' }} />
              <button onClick={() => { setAddGroupOpen(false); setNewGroupName('') }}
                className="h-7 px-2.5 rounded-[5px] text-[11px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">Hủy</button>
              <button onClick={handleAddGroup}
                className="h-7 px-3 rounded-[5px] text-[11px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                <Check className="w-3 h-3" /> Lưu
              </button>
            </div>
          )}

          {groups.length === 0 && !addGroupOpen ? (
            <div className="rounded-[10px] bg-[#fafafa] dark:bg-[#111] px-5 py-6 text-center" style={{ boxShadow: 'var(--shadow-border)' }}>
              <FolderOpen className="w-8 h-8 text-[#ccc] mx-auto mb-2" />
              <p className="text-[12px] text-[#999]">Chưa có nhóm nào.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {groups.map(g => {
                const itemCount = grouped(g.id).length
                return (
                  <div key={g.id} className="group rounded-[8px] bg-white dark:bg-[#111] px-4 py-3 flex items-center gap-3" style={{ boxShadow: 'var(--shadow-border)' }}>
                    <FolderOpen className="w-4 h-4 shrink-0 text-[#bbb]" />
                    {editingGroup === g.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input autoFocus value={editGroupName} onChange={e => setEditGroupName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditGroup(g.id); if (e.key === 'Escape') setEditingGroup(null) }}
                          className="flex-1 h-7 px-2 text-[13px] rounded-[5px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                          style={{ boxShadow: 'var(--shadow-border)' }} />
                        <button onClick={() => saveEditGroup(g.id)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingGroup(null)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{g.label}</p>
                          <p className="text-[11px] text-[#999]">{itemCount} trang</p>
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <button onClick={() => startEditGroup(g)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" title="Đổi tên"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteGroup(g.id)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Xóa nhóm"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ═══ 4. CUSTOM LINKS ════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] uppercase tracking-widest">Trang đã thêm ({links.length})</h2>
            <button onClick={() => setAddPageOpen(true)}
              className="flex h-7 items-center gap-1.5 px-3 rounded-[5px] text-[11px] font-medium text-[#999] hover:text-[#666] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <Plus className="w-3 h-3" /> Thêm trang
            </button>
          </div>
          <p className="text-[11px] text-[#999] mb-4">Chỉnh sửa icon, tên, nhóm hoặc xóa trang</p>

          {addPageOpen && (
            <div className="rounded-[10px] bg-white dark:bg-[#111] p-4 mb-3 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input ref={urlRef} value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPage(); if (e.key === 'Escape') setAddPageOpen(false) }}
                  placeholder="https://..." className="h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                  style={{ boxShadow: 'var(--shadow-border)' }} />
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPage() }}
                  placeholder="Tên hiển thị (tùy chọn)" className="h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                  style={{ boxShadow: 'var(--shadow-border)' }} />
              </div>
              <select value={newGroupId} onChange={e => setNewGroupId(e.target.value)}
                className="h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none cursor-pointer w-full sm:w-auto"
                style={{ boxShadow: 'var(--shadow-border)' }}>
                <option value="">Không nhóm</option>
                <optgroup label="Mặc định">
                  {BUILT_IN_GROUPS.map(g => <option key={g} value={BUILTIN_PREFIX + g}>{g}</option>)}
                </optgroup>
                {groups.length > 0 && (
                  <optgroup label="Tùy chỉnh">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </optgroup>
                )}
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setAddPageOpen(false); setNewUrl(''); setNewLabel(''); setNewGroupId('') }}
                  className="h-7 px-3 rounded-[5px] text-[11px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">Hủy</button>
                <button onClick={handleAddPage} disabled={savingIcon}
                  className="h-7 px-3 rounded-[5px] text-[11px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 disabled:opacity-60">
                  {savingIcon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  {savingIcon ? 'Đang chọn icon...' : 'Lưu'}
                </button>
              </div>
            </div>
          )}

          {links.length === 0 && !addPageOpen ? (
            <div className="rounded-[10px] bg-[#fafafa] dark:bg-[#111] px-5 py-6 text-center" style={{ boxShadow: 'var(--shadow-border)' }}>
              <Globe className="w-8 h-8 text-[#ccc] mx-auto mb-2" />
              <p className="text-[12px] text-[#999]">Chưa có trang nào.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Links in built-in groups */}
              {BUILT_IN_GROUPS.map(gName => {
                const items = builtinGrouped(gName); if (items.length === 0) return null
                return (<div key={gName}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] px-1 pt-3 pb-1.5">{gName}</p>
                  {items.map(item => renderLinkRow(item))}
                </div>)
              })}
              {/* Links in custom groups */}
              {groups.map(g => {
                const items = grouped(g.id); if (items.length === 0) return null
                return (<div key={g.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] px-1 pt-3 pb-1.5">{g.label}</p>
                  {items.map(item => renderLinkRow(item))}
                </div>)
              })}
              {ungrouped.length > 0 && (groups.length > 0 || BUILT_IN_GROUPS.some(g => builtinGrouped(g).length > 0)) && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] px-1 pt-3 pb-1.5">Không nhóm</p>
              )}
              {ungrouped.map(item => renderLinkRow(item))}
            </div>
          )}
        </section>
      </main>
    </div>
  )

  function renderLinkRow(item: ExternalItem) {
    const Icon = resolveIcon(item.icon)
    if (editingLink === item.href) {
      return (
        <div key={item.href} className="rounded-[10px] bg-white dark:bg-[#111] p-4 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1 block">Tên hiển thị</label>
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditLink(item.href); if (e.key === 'Escape') setEditingLink(null) }}
                className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                style={{ boxShadow: 'var(--shadow-border)' }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1 block">Nhóm</label>
              <select value={editGroupId} onChange={e => setEditGroupId(e.target.value)}
                className="w-full h-8 px-3 text-[13px] rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none cursor-pointer"
                style={{ boxShadow: 'var(--shadow-border)' }}>
                <option value="">Không nhóm</option>
                <optgroup label="Mặc định">
                  {BUILT_IN_GROUPS.map(g => <option key={g} value={BUILTIN_PREFIX + g}>{g}</option>)}
                </optgroup>
                {groups.length > 0 && (
                  <optgroup label="Tùy chỉnh">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1 block">Icon</label>
            <button onClick={() => setShowIconPicker(showIconPicker === item.href ? null : item.href)}
              className="flex h-8 items-center gap-2 px-3 rounded-[6px] text-[13px] text-[#444] dark:text-[#ccc] cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              {(() => { const I = resolveIcon(editIcon); return <I className="w-4 h-4" /> })()}
              <span>{editIcon}</span>
            </button>
            {showIconPicker === item.href && (
              <div className="mt-2 p-2 rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] grid grid-cols-10 sm:grid-cols-14 gap-1" style={{ boxShadow: 'var(--shadow-border)' }}>
                {ICON_NAMES.map(name => {
                  const I = ICON_MAP[name]
                  return (
                    <button key={name} onClick={() => { setEditIcon(name); setShowIconPicker(null) }} title={name}
                      className={cn('flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors cursor-pointer',
                        editIcon === name ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]' : 'text-[#666] dark:text-[#aaa] hover:bg-[#ebebeb] dark:hover:bg-[#222]'
                      )}><I className="w-4 h-4" /></button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingLink(null)} className="h-7 px-3 rounded-[5px] text-[11px] font-medium text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">Hủy</button>
            <button onClick={() => saveEditLink(item.href)} className="h-7 px-3 rounded-[5px] text-[11px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
              <Check className="w-3 h-3" /> Lưu
            </button>
          </div>
        </div>
      )
    }
    const isLinkHidden = hiddenItems.includes(item.href)
    return (
      <div key={item.href} className={cn('group rounded-[8px] bg-white dark:bg-[#111] px-4 py-3 flex items-center gap-3 transition-opacity', isLinkHidden && 'opacity-50')} style={{ boxShadow: 'var(--shadow-border)' }}>
        <Icon className="w-4 h-4 shrink-0 text-[#888]" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{item.label}</p>
          <p className="text-[11px] text-[#bbb] truncate">{item.href}</p>
        </div>
        {item.groupId && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#222] text-[#888] shrink-0 hidden sm:block">{getGroupLabel(item.groupId)}</span>
        )}
        <button onClick={() => toggleLinkVisibility(item.href)}
          className={cn('flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors cursor-pointer shrink-0',
            isLinkHidden ? 'text-[#ccc] hover:text-[#888]' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          )} title={isLinkHidden ? 'Hiện trên sidebar' : 'Ẩn khỏi sidebar'}>
          {isLinkHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
          <button onClick={() => refreshIcon(item)} disabled={refreshingIcon === item.href}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-40" title="AI chọn lại icon">
            {refreshingIcon === item.href ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <a href={item.href} target="_blank" rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" title="Mở trong tab mới">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => startEditLink(item)}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" title="Chỉnh sửa">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteLink(item.href)}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#bbb] hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer" title="Xóa">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }
}
