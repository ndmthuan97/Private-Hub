# 🗺️ Private Hub — Bản Đồ BE ↔ FE theo Chức Năng

> **Cách đọc:** Mỗi chức năng có 2 cột — **BE** (chạy server, gọi DB/AI) và **FE** (chạy browser, render UI).  
> Đường dẫn đều tính từ gốc `d:/Private_Space/Learn_Space/IT/private-hub/`

---

## 🔐 1. Authentication (Đăng nhập / Đăng xuất)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/auth/login/route.ts` | Nhận password → tạo HMAC token → set cookie `ph_session` |
| **BE** | `app/api/auth/logout/route.ts` | Xóa cookie session |
| **BE** | `middleware.ts` | Guard toàn bộ routes — verify HMAC token trước mọi request |
| **FE** | `app/login/page.tsx` | Form nhập password, gọi `/api/auth/login`, redirect sau login |

**Luồng:** FE submit form → BE tạo session cookie → middleware kiểm tra mọi request

---

## 📚 2. Vocabulary — Quản Lý Chủ Đề (Topics)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/vocab/topics/route.ts` | `GET` danh sách topics + word count / `POST` tạo topic mới |
| **BE** | `app/api/vocab/topics/[id]/route.ts` | `GET` chi tiết / `PATCH` sửa tên, slug, icon / `DELETE` xóa topic |
| **FE** | `app/vocab/page.tsx` | Danh sách topics, nút Add/Edit/Delete topic, hiển thị word count |
| **FE** | `app/vocab/[topicId]/page.tsx` | Trang chi tiết topic — xem/lọc/sắp xếp từ trong topic đó |

---

## 📝 3. Vocabulary — Quản Lý Từ Vựng (Words)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/vocab/words/route.ts` | `GET` danh sách từ (filter by topic, search) / `POST` tạo từ mới |
| **BE** | `app/api/vocab/words/[id]/route.ts` | `GET` chi tiết / `PATCH` cập nhật từ / `DELETE` soft-delete |
| **BE** | `app/api/vocab/words/bulk/route.ts` | `POST` bulk insert nhiều từ cùng lúc |
| **FE** | `app/vocab/page.tsx` | Form thêm từ, edit từ, hiển thị danh sách từ theo topic |
| **FE** | `app/vocab/[topicId]/page.tsx` | Bảng từ trong topic, inline edit, xóa từ |

---

## 🤖 4. Vocabulary — AI Fill (Tự Động Điền)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/vocab/ai-fill/route.ts` | Gọi Groq AI → tự điền IPA, định nghĩa EN/VI, word family, synonyms, antonyms, 2 câu ví dụ |
| **BE** | `lib/groq.ts` | Singleton Groq client, model `llama-3.3-70b-versatile` |
| **FE** | `app/vocab/page.tsx` | Nút "AI Fill" trong form thêm/sửa từ — gọi API rồi populate fields |

---

## 🃏 5. Vocabulary — SRS Flashcard (Luyện Từ)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/vocab/words/route.ts` | `GET` từ cần review hôm nay (`nextReviewAt <= now`) |
| **BE** | `app/api/vocab/words/[id]/route.ts` | `PATCH` cập nhật SRS fields: `easeFactor`, `reviewInterval`, `repetitions`, `nextReviewAt` |
| **FE** | `app/vocab/learn/page.tsx` | Flashcard UI — flip card, 4 nút đánh giá (Again/Hard/Good/Easy), progress bar |
| **FE (lib)** | `lib/tts.ts` | Phát âm từ bằng Web Speech API khi flip card |

**SRS Algorithm:** SM-2 — `easeFactor`, `reviewInterval`, `repetitions` lưu trong DB, tính `nextReviewAt` mới sau mỗi lần review.

---

## 💰 6. Budget — Phân Bổ Ngân Sách

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/budget/route.ts` | `GET` danh sách entries theo năm / `POST` tạo entry tháng mới |
| **BE** | `app/api/budget/[id]/route.ts` | `PATCH` cập nhật tổng thu nhập + allocations / `DELETE` xóa entry |
| **FE** | `app/budget/page.tsx` | Shell page — render tab điều hướng tháng, nhúng sub-components |
| **FE** | `app/budget/EntryManager.tsx` | Nhập tổng thu nhập, tính allocation tự động theo % từng hạng mục |
| **FE** | `app/budget/DetailDialog.tsx` | Dialog xem chi tiết phân bổ từng hạng mục trong tháng |

---

## ⚙️ 7. Budget — Quản Lý Hạng Mục (Categories)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/budget/categories/route.ts` | `GET` + `PUT` toàn bộ danh sách hạng mục (key, label, emoji, %) |
| **BE** | `app/api/budget/categories/[id]/route.ts` | `PATCH` / `DELETE` hạng mục theo ID |
| **BE** | `app/api/budget/suggest-category/route.ts` | AI gợi ý category (Groq) |
| **FE** | `app/budget/CategoryManager.tsx` | UI thêm/sửa/xóa/sắp xếp hạng mục, chỉnh % phân bổ |

---

## 🗺️ 8. Strategy — Roadmap (Nội Dung)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/strategy/route.ts` | `GET` toàn bộ roadmap items (kèm folder) / `POST` tạo item mới |
| **BE** | `app/api/strategy/[id]/route.ts` | `PATCH` sửa title/content/type/folderId / `DELETE` xóa roadmap |
| **BE** | `app/api/strategy/items/route.ts` | Bulk update sort order |
| **FE** | `app/strategy/page.tsx` | Editor đầy đủ — sidebar list, editor Markdown/embed, live preview |

---

## 📁 9. Strategy — Folders (Nhóm)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/strategy/folders/route.ts` | `GET` + `POST` folders |
| **BE** | `app/api/strategy/folders/[id]/route.ts` | `PATCH` đổi tên / `DELETE` folder |
| **FE** | `app/strategy/page.tsx` | Sidebar tree hiển thị folder, drag-drop sort, collapse/expand |

---

## 💬 10. Conversation — Chat AI

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/conversation/route.ts` | Nhận messages → gọi Groq → trả về response (luyện EN/JP) |
| **BE** | `lib/groq.ts` | Groq client dùng chung |
| **FE** | `app/conversation/page.tsx` | Chat UI — message bubbles, input box, chọn ngôn ngữ/scenario, gửi/nhận message |

---

## 📓 11. NotebookLM — Prompts

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/notebooklm/prompts/route.ts` | `GET` danh sách prompts / `POST` tạo prompt mới |
| **BE** | `app/api/notebooklm/prompts/[id]/route.ts` | `PATCH` sửa / `DELETE` xóa prompt |
| **FE** | `app/notebooklm/page.tsx` | Danh sách prompts, modal Add/Edit, nút Copy prompt, mở NotebookLM trong iframe |

---

## 🔧 12. DB Migration (Utility)

| Layer | File | Vai trò |
|---|---|---|
| **BE** | `app/api/migrate/route.ts` | `POST` chạy Drizzle migration on-demand (dùng khi deploy) |
| **Script** | `scripts/migrate.mjs` | Chạy migration từ CLI: `npm run db:migrate` |

---

## 🧩 Shared — Dùng Cả BE Lẫn FE

| File | Dùng ở đâu | Vai trò |
|---|---|---|
| `lib/api-response.ts` | **BE** build response / **FE** type response | Chuẩn hóa contract `{ statusCode, message, data, errors }` |
| `lib/utils.ts` | **FE** | `cn()` helper — merge Tailwind class names |
| `db/schema.ts` | **BE** Drizzle query / **FE** import types | Định nghĩa toàn bộ tables + TypeScript types |
| `db/index.ts` | **BE** only | DB connection singleton (postgres driver) |
| `lib/groq.ts` | **BE** only | Groq AI singleton |
| `lib/tts.ts` | **FE** only | Web Speech API — phát âm từ vựng |

---

## 🏗️ Layout & Navigation

| File | Vai trò |
|---|---|
| `app/layout.tsx` | Root layout — khởi tạo font, theme script, render Sidebar + Toaster |
| `components/layout/Sidebar.tsx` | Navigation sidebar — links tất cả modules, dark/light toggle |
| `components/ui/button.tsx` | Button component (CVA variants) |
| `components/ui/tip.tsx` | Tooltip wrapper (Radix UI) |
| `app/globals.css` | CSS variables (design tokens), base styles, dark mode |
| `app/not-found.tsx` | 404 page |

---

## 📊 Tổng Hợp Nhanh

| Module | BE files | FE files |
|---|---|---|
| Auth | 3 | 1 |
| Vocab Topics | 2 | 2 |
| Vocab Words | 3 | 2 |
| Vocab AI Fill | 1 + lib | 1 (trong vocab page) |
| Vocab SRS | 1 | 1 + lib/tts |
| Budget Entry | 2 | 2 |
| Budget Categories | 2 | 1 |
| Strategy Roadmap | 3 | 1 |
| Strategy Folders | 2 | 1 (trong strategy page) |
| Conversation AI | 1 + lib | 1 |
| NotebookLM | 2 | 1 |
| DB Migration | 2 | — |

> **Gợi ý đọc code:** Bắt đầu từ `middleware.ts` → `db/schema.ts` → một module nhỏ như **Vocab Topics** để hiểu pattern BE→FE trước khi đọc các module phức tạp hơn (Strategy, SRS).
