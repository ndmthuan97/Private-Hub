"use client";
// app/conversation/page.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Language = "en" | "jp";
type Persona = "teacher" | "friend" | "business";
type JlptLevel = "N5" | "N4" | "N3";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SCENARIOS_EN = [
  { id: "casual", label: "☕ Trò chuyện thường ngày", prompt: "Coffee shop casual conversation" },
  { id: "interview", label: "💼 Phỏng vấn xin việc", prompt: "Job interview in English" },
  { id: "shopping", label: "🛒 Mua sắm & đặt đồ ăn", prompt: "Shopping or ordering food at a restaurant" },
  { id: "email", label: "📧 Email chuyên nghiệp", prompt: "Professional email and business communication" },
  { id: "travel", label: "✈️ Du lịch & hỏi đường", prompt: "Travel, asking for directions, at the airport" },
];

const SCENARIOS_JP = [
  { id: "restaurant", label: "🍱 Nhà hàng (レストラン)", prompt: "レストランで注文する" },
  { id: "shopping", label: "🏪 Mua sắm (ショッピング)", prompt: "ショッピングモールで買い物する" },
  { id: "direction", label: "🚃 Hỏi đường (道案内)", prompt: "駅や目的地への道案内" },
  { id: "intro", label: "👋 Giới thiệu bản thân (自己紹介)", prompt: "自己紹介と初めての挨拶" },
  { id: "business", label: "🏢 Văn phòng (ビジネス敬語)", prompt: "ビジネスシーンでの敬語会話" },
];

const PERSONAS: { id: Persona; label: string; desc: string }[] = [
  { id: "teacher", label: "Giáo viên", desc: "Kiên nhẫn, giải thích chi tiết" },
  { id: "friend",  label: "Bạn bè",   desc: "Tự nhiên, thân thiện" },
  { id: "business",label: "Đồng nghiệp", desc: "Chuyên nghiệp, formal" },
];

// Parse AI reply to extract correction block
function parseReply(raw: string): { main: string; correction: string | null } {
  const corrIdx = raw.indexOf("💡");
  if (corrIdx === -1) return { main: raw.trim(), correction: null };
  return {
    main: raw.slice(0, corrIdx).trim(),
    correction: raw.slice(corrIdx).trim(),
  };
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const { main, correction } = isUser ? { main: msg.content, correction: null } : parseReply(msg.content);

  // TTS
  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(main);
    utt.lang = "en-US"; // simplified — could be dynamic
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className={cn("flex gap-3 animate-fade-up", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-convo flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-[12px] font-[700]">AI</span>
        </div>
      )}

      <div className={cn("max-w-[75%] space-y-2", isUser ? "items-end" : "items-start")}>
        {/* Main message */}
        <div
          className={cn(
            "rounded-[12px] px-4 py-3 text-[14px] leading-[1.65]",
            isUser
              ? "bg-[var(--brand)] text-white rounded-tr-[4px]"
              : "bg-[var(--bg-elevated)] text-[var(--fg-primary)] rounded-tl-[4px] [box-shadow:var(--shadow-border)]"
          )}
        >
          <p className="whitespace-pre-wrap">{main}</p>
        </div>

        {/* Correction block */}
        {correction && (
          <div className="rounded-[8px] px-4 py-3 bg-[hsl(38,92%,52%,0.08)] [box-shadow:inset_0_0_0_1px_hsl(38,92%,52%,0.2)] text-[13px] leading-[1.56]">
            <p className="text-[var(--fg-secondary)] whitespace-pre-wrap">{correction}</p>
          </div>
        )}

        {/* TTS button for AI messages */}
        {!isUser && (
          <button
            onClick={speak}
            className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-secondary)] transition-colors duration-[150ms] flex items-center gap-1 cursor-pointer"
            aria-label="Phát âm tin nhắn này"
          >
            🔊 Phát âm
          </button>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[var(--brand)] flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-[12px] font-[700]">Tôi</span>
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-fade-up">
      <div className="w-8 h-8 rounded-full gradient-convo flex items-center justify-center shrink-0">
        <span className="text-white text-[12px] font-[700]">AI</span>
      </div>
      <div className="bg-[var(--bg-elevated)] [box-shadow:var(--shadow-border)] rounded-[12px] rounded-tl-[4px] px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [persona, setPersona] = useState<Persona>("friend");
  const [jlptLevel, setJlptLevel] = useState<JlptLevel>("N4");
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scenarios = language === "en" ? SCENARIOS_EN : SCENARIOS_JP;
  const activeScenario = scenarios.find((s) => s.id === selectedScenario);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!selectedScenario) {
      toast.error("Vui lòng chọn tình huống trước khi chat");
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    setShowSettings(false);

    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          language,
          persona,
          scenario: activeScenario?.prompt ?? selectedScenario,
          jlptLevel,
        }),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply }]);
      } else {
        toast.error("AI không phản hồi, thử lại nhé");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, selectedScenario, messages, language, persona, activeScenario, jlptLevel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([]);
    setShowSettings(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar — Vercel KI: sticky nav */}
      <div className="shrink-0 px-6 py-3 bg-[var(--bg-surface)] [box-shadow:0_1px_0_0_rgba(255,255,255,0.06)] sticky top-0 z-[10] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="conversation">💬 Luyện Giao Tiếp</Badge>
          {/* Language toggle */}
          <div className="flex rounded-[6px] [box-shadow:var(--shadow-border)] overflow-hidden">
            {(["en", "jp"] as Language[]).map((lang) => (
              <button
                key={lang}
                id={`lang-${lang}`}
                onClick={() => { setLanguage(lang); setSelectedScenario(""); setMessages([]); setShowSettings(true); }}
                className={cn(
                  "px-3 py-1.5 text-[13px] font-[500] cursor-pointer transition-colors duration-[150ms]",
                  language === lang
                    ? "bg-[var(--convo-color)] text-white"
                    : "bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]"
                )}
              >
                {lang === "en" ? "🇺🇸 EN" : "🇯🇵 JP"}
              </button>
            ))}
          </div>
        </div>

        {messages.length > 0 && (
          <Button id="btn-reset-chat" variant="ghost" size="icon-sm" onClick={reset} aria-label="Bắt đầu lại">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="shrink-0 px-6 py-4 bg-[var(--bg-base)] [box-shadow:0_1px_0_0_rgba(255,255,255,0.06)] animate-fade-up">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Scenario */}
            <div>
              <p className="text-[12px] font-[500] text-[var(--fg-muted)] uppercase tracking-[0.06em] mb-2">
                Chọn tình huống
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scenarios.map((s) => (
                  <button
                    key={s.id}
                    id={`scenario-${s.id}`}
                    onClick={() => setSelectedScenario(s.id)}
                    className={cn(
                      "text-left px-3 py-2.5 rounded-[6px] text-[13px] font-[500] cursor-pointer",
                      "transition-all duration-[150ms]",
                      selectedScenario === s.id
                        ? "bg-[var(--convo-color)] text-white"
                        : "bg-[var(--bg-surface)] text-[var(--fg-secondary)] [box-shadow:var(--shadow-border)] hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Persona + JLPT (JP only) */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-[12px] font-[500] text-[var(--fg-muted)] uppercase tracking-[0.06em] mb-2">
                  Vai trò AI
                </p>
                <div className="flex gap-1.5">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      id={`persona-${p.id}`}
                      onClick={() => setPersona(p.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-[6px] text-[13px] font-[500] cursor-pointer",
                        "transition-all duration-[150ms]",
                        persona === p.id
                          ? "bg-[var(--bg-elevated)] text-[var(--fg-primary)] [box-shadow:var(--shadow-border)]"
                          : "text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]"
                      )}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {language === "jp" && (
                <div>
                  <p className="text-[12px] font-[500] text-[var(--fg-muted)] uppercase tracking-[0.06em] mb-2">
                    Trình độ JLPT
                  </p>
                  <div className="flex gap-1.5">
                    {(["N5", "N4", "N3"] as JlptLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        id={`jlpt-${lvl}`}
                        onClick={() => setJlptLevel(lvl)}
                        className={cn(
                          "px-3 py-1.5 rounded-[6px] text-[13px] font-[500] cursor-pointer",
                          "transition-all duration-[150ms]",
                          jlptLevel === lvl
                            ? "bg-[var(--digest-color)] text-white"
                            : "text-[var(--fg-muted)] [box-shadow:var(--shadow-border)] bg-[var(--bg-surface)] hover:text-[var(--fg-secondary)]"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedScenario && (
              <Button
                id="btn-start-chat"
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={() => setShowSettings(false)}
              >
                Bắt đầu luyện tập →
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !showSettings && (
            <div className="text-center py-12 animate-fade-up">
              <p className="text-[15px] text-[var(--fg-muted)]">
                {language === "en"
                  ? "Say something to start the conversation!"
                  : "何か話しかけてみましょう！"}
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      {!showSettings && (
        <div className="shrink-0 px-6 py-4 bg-[var(--bg-surface)] [box-shadow:0_-1px_0_0_rgba(255,255,255,0.06)]">
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <div className="flex-1 rounded-[8px] bg-[var(--bg-elevated)] [box-shadow:var(--shadow-border)] overflow-hidden focus-within:[box-shadow:0_0_0_2px_hsla(212,100%,48%,1)] transition-[box-shadow] duration-[150ms]">
              <textarea
                ref={inputRef}
                id="chat-input"
                rows={1}
                placeholder={language === "en" ? "Type your message..." : "メッセージを入力..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="w-full bg-transparent px-4 py-3 text-[14px] text-[var(--fg-primary)] placeholder:text-[var(--fg-muted)] resize-none focus:outline-none min-h-[44px] max-h-32"
                aria-label="Nhập tin nhắn"
              />
            </div>
            <Button
              id="btn-send-message"
              variant="primary"
              size="icon"
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-center text-[11px] text-[var(--fg-muted)] mt-2">
            Enter để gửi · Shift+Enter xuống dòng
          </p>
        </div>
      )}
    </div>
  );
}
