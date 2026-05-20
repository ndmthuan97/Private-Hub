# Setup Guide — Daily NotebookLM Sync

## Tổng quan

Pipeline chạy mỗi ngày lúc **8:00 AM (Vietnam)** qua GitHub Actions:

```
GitHub Actions (miễn phí)
  → query NotebookLM (notebook của bạn)
  → POST kết quả vào /api/strategy
  → Content tự động xuất hiện trên website
```

---

## Bước 1 — Lấy Notebook ID

1. Mở NotebookLM: https://notebooklm.google.com
2. Mở notebook chứa tài liệu từ vựng / ngữ pháp
3. Copy phần UUID trong URL:

```
https://notebooklm.google.com/notebook/abc123-def456-...
                                        ↑ đây là NOTEBOOK_ID
```

---

## Bước 2 — Export Google Cookies

GitHub Actions cần cookies để đăng nhập thay bạn.

### Cài extension (1 lần):
- Chrome: **"EditThisCookie"** hoặc **"Cookie-Editor"**
- Firefox: **"Cookie-Editor"**

### Export cookies:
1. Đăng nhập vào https://notebooklm.google.com
2. Click vào extension Cookie-Editor
3. Chọn **Export → JSON**
4. Copy toàn bộ JSON (đây là `GOOGLE_COOKIES`)

> ⚠️ **Lưu ý bảo mật:** Cookies này = quyền truy cập Google account của bạn.
> Chỉ lưu vào GitHub Secret, KHÔNG commit vào code.

---

## Bước 3 — Tạo GitHub Secrets

Vào repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**

Tạo 4 secrets sau:

| Secret Name | Giá trị |
|---|---|
| `NOTEBOOK_ID` | UUID từ URL NotebookLM |
| `WEBSITE_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | Giá trị `CRON_SECRET` trong file `.env` của bạn |
| `GOOGLE_COOKIES` | JSON cookies export từ Bước 2 |

---

## Bước 4 — Push code lên GitHub

```bash
git add automation/ .github/
git commit -m "feat: add daily NotebookLM sync automation"
git push
```

---

## Bước 5 — Test chạy thủ công

1. Vào GitHub repo → tab **Actions**
2. Chọn workflow **"Daily NotebookLM Sync"**
3. Click **"Run workflow"** → **Run workflow**
4. Xem logs theo thời gian thực

Nếu thành công → kiểm tra website, content mới sẽ xuất hiện.

---

## Bước 6 — Refresh cookies (mỗi 2-4 tuần)

Google cookies hết hạn sau ~2-4 tuần. Khi workflow bị lỗi auth:

1. Export cookies mới từ trình duyệt (lặp lại Bước 2)
2. Cập nhật GitHub Secret `GOOGLE_COOKIES`
3. Chạy lại workflow

---

## Tùy chỉnh thêm

### Đổi giờ chạy
Sửa trong `.github/workflows/daily-sync.yml`:
```yaml
- cron: "0 1 * * *"   # 01:00 UTC = 08:00 AM Vietnam
- cron: "0 23 * * *"  # 23:00 UTC = 06:00 AM Vietnam (hôm sau)
```

### Thêm chủ đề ngữ pháp
Sửa file `automation/grammar_topics.json` — thêm topic vào list.

### Chạy nhiều lần/ngày
Thêm cron expression:
```yaml
schedule:
  - cron: "0 1 * * *"   # 8:00 AM
  - cron: "0 13 * * *"  # 8:00 PM
```
