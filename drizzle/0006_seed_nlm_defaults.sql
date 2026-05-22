-- Seed 2 default prompts with fixed UUIDs so this is idempotent (safe to run multiple times)
INSERT INTO "nlm_prompts" ("id", "title", "content", "quiz_prompt", "sort_order")
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Email từ vựng ngẫu nhiên',
    'Hôm nay hãy lấy ngẫu nhiên 10 từ mới trong file từ vựng này (ưu tiên các từ loại Động từ và Danh từ). Hãy viết cho tôi một đoạn Email công sở (chuẩn Part 7 TOEIC) bằng 100% tiếng Anh bao gồm 10 từ này.',
    'Generate exactly 30 quiz questions in English based on all vocabulary words that appeared in the office email just generated — including the 10 selected words AND any other notable words from the email body. Test their meanings, correct usage in context, and synonyms. Use fill-in-the-blank or choose-the-correct-meaning format with realistic workplace sentences. Number each question clearly.',
    -2
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Giải thích ngữ pháp + bài tập',
    'Hãy tóm tắt cho tôi quy tắc cốt lõi nhất của chủ điểm ngữ pháp: ''[Điền tên bài/chủ đề bạn muốn học, VD: Rút gọn mệnh đề quan hệ]''. Dùng ngôn ngữ bình dân, dễ hiểu nhất, tuyệt đối không dùng từ ngữ học thuật giáo điều. Sau đó, cho tôi 10 câu bài tập trắc nghiệm siêu ngắn để tôi test thử ngay xem có hiểu lý thuyết chưa nhé.',
    'Generate exactly 30 quiz questions in English based solely on the grammar topic just explained. Questions must test whether I can correctly apply the grammar rule in real sentences — include tricky distractors that reveal common mistakes. Do not test unrelated grammar points. Number each question clearly.',
    -1
  )
ON CONFLICT ("id") DO NOTHING;
