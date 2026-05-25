/**
 * Lightweight TTS utility using Web Speech API.
 * Reads English text aloud with the best available en-US voice.
 *
 * Usage:
 *   import { speak } from '@/lib/tts'
 *   speak('Hello world')
 */

/** Resolve the best available en-US voice. */
function resolveVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Prefer Google US English for clearest output
  return (
    voices.find(v => v.name === 'Google US English') ??
    voices.find(v => v.lang === 'en-US') ??
    null
  )
}

/** Speak English text. No-op outside browser. */
export function speak(text: string, rate = 0.9): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()

  const u   = new SpeechSynthesisUtterance(text)
  u.lang    = 'en-US'
  u.rate    = rate

  // Voices may load async — retry once if list is empty
  const trySpeak = () => {
    const voice = resolveVoice()
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      trySpeak()
    }
  } else {
    trySpeak()
  }
}
