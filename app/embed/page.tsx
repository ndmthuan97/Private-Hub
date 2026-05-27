'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react'

const LOAD_TIMEOUT_MS = 10_000

function EmbedContent() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''
  const label = searchParams.get('label') ?? ''

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // Iframe blocked by X-Frame-Options/CSP won't fire onLoad — detect via timeout
    timeoutRef.current = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'error' : prev)
    }, LOAD_TIMEOUT_MS)
  }, [])

  useEffect(() => {
    if (!url) return
    setStatus('loading')
    startTimeout()
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [url, startTimeout])

  function handleLoad() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('loaded')
  }

  function handleError() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setStatus('error')
  }

  function handleRetry() {
    setStatus('loading')
    startTimeout()
    if (iframeRef.current) {
      iframeRef.current.src = url
    }
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[13px] text-[#999]">Không có URL để nhúng</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      {/* Top bar with page info */}
      <div className="shrink-0 px-4 h-10 flex items-center justify-between bg-white dark:bg-[#111]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(url).hostname } catch { return '' } })()}&sz=16`}
            alt="" className="w-4 h-4 shrink-0 rounded-sm" />
          <span className="text-[12px] font-medium text-[#444] dark:text-[#aaa] truncate">
            {label || url}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleRetry}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            title="Tải lại">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            title="Mở trong tab mới">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative min-h-0">
        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg-base)]">
            <Loader2 className="h-5 w-5 animate-spin text-[#999] mb-3" />
            <p className="text-[12px] text-[#999]">Đang tải trang...</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-base)]">
            <div className="max-w-sm w-full mx-4 rounded-[12px] bg-white dark:bg-[#111] p-6 text-center"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20 mx-auto mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-1">
                Không thể nhúng trang này
              </h2>
              <p className="text-[12px] text-[#888] leading-relaxed mb-4">
                Trang web <span className="font-medium text-[#555] dark:text-[#aaa]">{label || url}</span> không cho phép hiển thị trong iframe.
                Bạn có thể mở nó trong tab mới.
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={handleRetry}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
                  <ExternalLink className="h-3.5 w-3.5" /> Mở trong tab mới
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Iframe — always rendered so onLoad/onError can fire */}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          style={{ display: status === 'error' ? 'none' : 'block' }}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          title={label || 'Embedded page'}
        />
      </div>
    </div>
  )
}

export default function EmbedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
      </div>
    }>
      <EmbedContent />
    </Suspense>
  )
}
