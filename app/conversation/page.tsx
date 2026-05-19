"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Language = "en" | "jp";
type Persona = "teacher" | "friend" | "business";
type JlptLevel = "N5" | "N4" | "N3";
type Step = "language" | "topic" | "role" | "chat";

interface Message { role: "user" | "assistant"; content: string; }
interface Topic   { id: string; label: string; prompt: string; }

const TOPIC_POOL_EN: Topic[] = [
  { id: "casual",        label: "☕ Trò chuyện thường ngày",     prompt: "Coffee shop casual conversation" },
  { id: "interview",     label: "💼 Phỏng vấn xin việc",         prompt: "Job interview in English" },
  { id: "shopping",      label: "🛒 Mua sắm & đặt đồ ăn",        prompt: "Shopping or ordering food at a restaurant" },
  { id: "email",         label: "📧 Email chuyên nghiệp",         prompt: "Professional email and business communication" },
  { id: "travel",        label: "✈️ Du lịch & hỏi đường",        prompt: "Travel, asking for directions, at the airport" },
  { id: "doctor",        label: "🏥 Đặt lịch khám bác sĩ",       prompt: "Booking a doctor's appointment" },
  { id: "hotel",         label: "🏨 Check-in khách sạn",          prompt: "Hotel check-in and concierge requests" },
  { id: "negotiate",     label: "🤝 Thương lượng hợp đồng",       prompt: "Negotiating a business deal or contract" },
  { id: "party",         label: "🎉 Giao tiếp xã giao",           prompt: "Small talk at a party or social event" },
  { id: "phone",         label: "📞 Gọi điện thoại",              prompt: "Making a phone call in English" },
  { id: "hobby",         label: "🎮 Chia sẻ sở thích",            prompt: "Discussing hobbies and interests" },
  { id: "bank",          label: "🏦 Giao dịch ngân hàng",         prompt: "At the bank — opening account, transfers" },
  { id: "apartment",     label: "🏠 Thuê phòng / căn hộ",         prompt: "Renting an apartment or room" },
  { id: "presentation",  label: "🎤 Thuyết trình",                prompt: "Giving a presentation or public speech" },
  { id: "complaint",     label: "😤 Khiếu nại dịch vụ",           prompt: "Making a complaint about a product or service" },
];

const TOPIC_POOL_JP: Topic[] = [
  { id: "restaurant",  label: "🍱 Nhà hàng (レストラン)",           prompt: "レストランで注文する" },
  { id: "shopping",    label: "🏪 Mua sắm (ショッピング)",           prompt: "ショッピングモールで買い物する" },
  { id: "direction",   label: "🚃 Hỏi đường (道案内)",              prompt: "駅や目的地への道案内" },
  { id: "intro",       label: "👋 Tự giới thiệu (自己紹介)",         prompt: "自己紹介と初めての挨拶" },
  { id: "business",    label: "🏢 Văn phòng (ビジネス敬語)",         prompt: "ビジネスシーンでの敬語会話" },
  { id: "hospital",    label: "🏥 Bệnh viện (病院)",                prompt: "病院での診察会話" },
  { id: "hotel",       label: "🏨 Khách sạn (ホテル)",              prompt: "ホテルのチェックインと問い合わせ" },
  { id: "phone",       label: "📞 Điện thoại (電話)",               prompt: "日本語での電話のやりとり" },
  { id: "train",       label: "🚆 Đi tàu (電車)",                   prompt: "電車の乗り方と駅での会話" },
  { id: "convenience", label: "🏪 Cửa hàng tiện lợi (コンビニ)",    prompt: "コンビニでの買い物と支払い" },
  { id: "post",        label: "📮 Bưu điện (郵便局)",               prompt: "郵便局での手続き" },
  { id: "bank",        label: "🏦 Ngân hàng (銀行)",               prompt: "銀行での口座開設と手続き" },
  { id: "interview",   label: "💼 Phỏng vấn (面接)",               prompt: "アルバイトや就職の面接" },
  { id: "class",       label: "📚 Lớp học (授業)",                  prompt: "授業中の質問と先生とのやりとり" },
  { id: "hobby",       label: "🎮 Sở thích (趣味)",                prompt: "趣味について友達と話す" },
];

const PERSONAS: { id: Persona; label: string; desc: string; icon: string }[] = [
  { id: "teacher",  label: "Giáo viên",    desc: "Kiên nhẫn, giải thích chi tiết từng lỗi",   icon: "👨‍🏫" },
  { id: "friend",   label: "Bạn bè",       desc: "Tự nhiên, thân thiện, casual",               icon: "👥" },
  { id: "business", label: "Đồng nghiệp",  desc: "Chuyên nghiệp, formal, đúng ngữ cảnh",      icon: "💼" },
];

function pickRandom<T>(arr: T[], n: number, exclude: T[] = []): T[] {
  const pool = arr.filter(x => !exclude.includes(x));
  // Fall back to full array when remaining pool is smaller than requested count
  const source = pool.length >= n ? pool : arr;
  return [...source].sort(() => Math.random() - 0.5).slice(0, n);
}

function parseReply(raw: string): { main: string; correction: string | null } {
  const idx = raw.indexOf("💡");
  if (idx === -1) return { main: raw.trim(), correction: null };
  return { main: raw.slice(0, idx).trim(), correction: raw.slice(idx).trim() };
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const { main, correction } = isUser ? { main: msg.content, correction: null } : parseReply(msg.content);
  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(main);
    utt.lang = "en-US";
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
        <div className={cn(
          "rounded-[12px] px-4 py-3 text-[14px] leading-[1.65]",
          isUser
            ? "bg-[var(--brand)] text-white rounded-tr-[4px]"
            : "bg-[var(--bg-elevated)] text-[var(--fg-primary)] rounded-tl-[4px] [box-shadow:var(--shadow-border)]"
        )}>
          <p className="whitespace-pre-wrap">{main}</p>
        </div>
        {correction && (
          <div className="rounded-[8px] px-4 py-3 bg-[hsl(38,92%,52%,0.08)] [box-shadow:inset_0_0_0_1px_hsl(38,92%,52%,0.2)] text-[13px] leading-[1.56]">
            <p className="text-[var(--fg-secondary)] whitespace-pre-wrap">{correction}</p>
          </div>
        )}
        {!isUser && (
          <button onClick={speak}
            className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-secondary)] transition-colors flex items-center gap-1 cursor-pointer">
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
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  );
}

function TopBar({ onBack, backLabel, right }: { onBack?: () => void; backLabel?: string; right?: React.ReactNode }) {
  return (
    <div className="shrink-0 px-6 py-3 bg-white dark:bg-[#111] sticky top-0 z-[10] flex items-center justify-between"
      style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
          💬 {backLabel ?? "Luyện Giao Tiếp"}
        </p>
      </div>
      {right}
    </div>
  );
}

export default function ConversationPage() {
  const [step, setStep]                       = useState<Step>("language");
  const [language, setLanguage]               = useState<Language>("en");
  const [persona, setPersona]                 = useState<Persona>("friend");
  const [jlptLevel, setJlptLevel]             = useState<JlptLevel>("N4");
  const [selectedTopic, setSelectedTopic]     = useState<Topic | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<Topic[]>([]);
  const shownTopicsRef = useRef<Topic[]>([]);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [input, setInput]                     = useState("");
  const [sending, setSending]                 = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function selectLanguage(lang: Language) {
    setLanguage(lang);
    shownTopicsRef.current = [];
    const picked = pickRandom(lang === "en" ? TOPIC_POOL_EN : TOPIC_POOL_JP, 6);
    shownTopicsRef.current = picked;
    setSuggestedTopics(picked);
    setStep("topic");
  }

  function refreshTopics() {
    const pool = language === "en" ? TOPIC_POOL_EN : TOPIC_POOL_JP;
    const picked = pickRandom(pool, 6, shownTopicsRef.current);
    shownTopicsRef.current = [...shownTopicsRef.current, ...picked];
    setSuggestedTopics(picked);
  }

  function selectTopic(topic: Topic) {
    setSelectedTopic(topic);
    setStep("role");
  }

  function selectRole(p: Persona) {
    setPersona(p);
    setMessages([]);
    setStep("chat");
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !selectedTopic) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/conversation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, language, persona, scenario: selectedTopic.prompt, jlptLevel }),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        setMessages(prev => [...prev, { role: "assistant", content: json.data.reply }]);
      } else toast.error("AI không phản hồi, thử lại nhé");
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSending(false); inputRef.current?.focus(); }
  }, [input, sending, selectedTopic, messages, language, persona, jlptLevel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const reset = () => { setMessages([]); setSelectedTopic(null); setStep("language"); };

  /* ── Step 1: Language ─────────────────────────────────────────── */
  if (step === "language") return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
            💬 Luyện Giao Tiếp
          </p>
          <h1 className="text-[22px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chọn ngôn ngữ</h1>
          <p className="text-[13px] text-[#999]">Bạn muốn luyện tập ngôn ngữ nào hôm nay?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { lang: "en" as Language, flag: "🇺🇸", name: "English",  sub: "Tiếng Anh" },
            { lang: "jp" as Language, flag: "🇯🇵", name: "日本語",    sub: "Tiếng Nhật" },
          ]).map(item => (
            <button key={item.lang} onClick={() => selectLanguage(item.lang)}
              className="flex flex-col items-center gap-2 py-7 px-4 rounded-[12px] bg-white dark:bg-[#111] hover:ring-2 hover:ring-[hsl(160,84%,42%)] transition-all duration-150 cursor-pointer group"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-[40px]">{item.flag}</span>
              <span className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[hsl(160,84%,42%)] transition-colors">{item.name}</span>
              <span className="text-[12px] text-[#999]">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ── Step 2: Topic ────────────────────────────────────────────── */
  if (step === "topic") return (
    <div className="flex flex-col h-screen">
      <TopBar
        onBack={() => setStep("language")}
        right={<span className="text-[13px] font-medium text-[#999]">{language === "en" ? "🇺🇸 English" : "🇯🇵 日本語"}</span>}
      />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chọn chủ đề</h2>
              <p className="text-[12px] text-[#999] mt-0.5">Bấm để chọn, làm mới để xem chủ đề khác</p>
            </div>
            <button onClick={refreshTopics}
              className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#666] dark:text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <RefreshCw className="w-3.5 h-3.5" />Làm mới
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics.map((topic, i) => (
              <button key={topic.id} onClick={() => selectTopic(topic)}
                className={cn(
                  "text-left px-4 py-3.5 rounded-[8px] bg-white dark:bg-[#111] text-[14px] font-medium text-[#555] dark:text-[#aaa] hover:text-[hsl(160,84%,38%)] dark:hover:text-[hsl(160,84%,52%)] hover:ring-1 hover:ring-[hsl(160,84%,42%,0.4)] transition-all duration-150 cursor-pointer",
                  "w-full sm:w-[calc(50%-4px)]",
                  suggestedTopics.length % 2 !== 0 && i === suggestedTopics.length - 1 && "sm:mx-auto"
                )}
                style={{ boxShadow: "var(--shadow-border)" }}>
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Step 3: Role ─────────────────────────────────────────────── */
  if (step === "role") return (
    <div className="flex flex-col h-screen">
      <TopBar onBack={() => setStep("topic")} />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-[hsl(160,84%,42%,0.1)] text-[hsl(160,84%,35%)] dark:text-[hsl(160,84%,52%)]"
            style={{ boxShadow: "inset 0 0 0 1px hsl(160,84%,42%,0.25)" }}>
            {selectedTopic?.label}
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chọn vai trò AI</h2>
            <p className="text-[12px] text-[#999] mt-0.5">Bấm vào một vai trò để bắt đầu cuộc trò chuyện</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => selectRole(p.id)}
                className="flex flex-col items-start gap-2.5 px-4 py-4 rounded-[8px] bg-white dark:bg-[#111] hover:ring-1 hover:ring-[hsl(160,84%,42%,0.4)] transition-all duration-150 cursor-pointer text-left group"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <span className="text-[26px]">{p.icon}</span>
                <div>
                  <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[hsl(160,84%,42%)] transition-colors">{p.label}</p>
                  <p className="text-[11px] text-[#999] mt-0.5 leading-[1.5]">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {language === "jp" && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-2">Trình độ JLPT</p>
              <div className="flex gap-1.5">
                {(["N5", "N4", "N3"] as JlptLevel[]).map(lvl => (
                  <button key={lvl} onClick={() => setJlptLevel(lvl)}
                    className={cn(
                      "px-3 py-1.5 rounded-[6px] text-[12px] font-medium cursor-pointer transition-all duration-150",
                      jlptLevel === lvl
                        ? "bg-[hsl(271,91%,65%)] text-white"
                        : "text-[#999] hover:text-[#666] dark:hover:text-[#aaa]"
                    )}
                    style={jlptLevel !== lvl ? { boxShadow: "var(--shadow-border)" } : {}}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ── Chat ─────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen">
      <TopBar
        right={
          <div className="flex items-center gap-2">
            {selectedTopic && (
              <span className="text-[12px] text-[#999] truncate max-w-[200px] hidden sm:block">
                {selectedTopic.label}
              </span>
            )}
            <button onClick={reset} aria-label="Bắt đầu lại"
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 animate-fade-up">
              <p className="text-[15px] text-[var(--fg-muted)]">
                {language === "en" ? "Say something to start the conversation!" : "何か話しかけてみましょう！"}
              </p>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="shrink-0 px-6 py-4 bg-white dark:bg-[#111]"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <div className="flex-1 rounded-[8px] overflow-hidden" style={{ boxShadow: "var(--shadow-border)" }}>
            <textarea ref={inputRef} id="chat-input" rows={1}
              placeholder={language === "en" ? "Type your message..." : "メッセージを入力..."}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} disabled={sending}
              className="w-full bg-[#fafafa] dark:bg-[#1a1a1a] px-4 py-3 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] resize-none focus:outline-none min-h-[44px] max-h-32"
              aria-label="Nhập tin nhắn" />
          </div>
          <button id="btn-send-message" onClick={sendMessage}
            disabled={sending || !input.trim()} aria-label="Gửi tin nhắn"
            className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[11px] text-[#bbb] mt-2">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  );
}
