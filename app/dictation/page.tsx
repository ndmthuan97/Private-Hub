'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ExternalLink, Maximize2, Minimize2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DictationPage() {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const DICTATION_URL = 'https://dailydictation.com/exercises'

  useEffect(() => {
    // Detect if iframe fails to load (blocked by X-Frame-Options)
    const timer = setTimeout(() => {
      if (loading) setError(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [loading])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header — hidden on mobile */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a] shrink-0 hidden md:block"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-7xl px-4 h-11 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0 cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleFullscreen}
              className="flex items-center justify-center h-7 w-7 rounded-[5px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <a href={DICTATION_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-[11px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <ExternalLink className="h-3 w-3" /> Mở tab mới
            </a>
          </div>
        </div>
      </header>

      {/* Iframe container */}
      <div className="flex-1 relative">
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-white dark:bg-[#0a0a0a]">
            <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
            <p className="text-[12px] text-[#999]">Đang tải Daily Dictation...</p>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f5] dark:bg-[#1a1a1a]">
              <ExternalLink className="h-7 w-7 text-[#999]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
                Không thể nhúng trang này
              </h2>
              <p className="text-[13px] text-[#888] max-w-sm mx-auto leading-relaxed">
                Daily Dictation không cho phép nhúng trong iframe. Bấm nút bên dưới để mở trong tab mới.
              </p>
            </div>
            <a href={DICTATION_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2.5 text-[13px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
              <ExternalLink className="h-4 w-4" /> Mở Daily Dictation
            </a>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={DICTATION_URL}
            className="w-full h-full border-0"
            style={{ minHeight: 'calc(100vh - 44px)' }}
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            allow="autoplay; microphone"
            title="Daily Dictation Exercises"
          />
        )}
      </div>
    </div>
  )
}
