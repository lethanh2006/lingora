# Lingora

Lingora là ứng dụng học từ vựng theo chủ đề. Quản trị viên tạo chủ đề và danh sách từ; người học thấy nội dung đó ngay và luyện bằng ba trò chơi: lật thẻ, ghép từ và điền từ.

Tài liệu sản phẩm, luồng, dữ liệu và tiêu chí nghiệm thu chính thức nằm tại [lingora.md](./lingora.md). Tài liệu xử lý sự cố nằm tại [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md).

## Tính năng chính

- Đăng ký/đăng nhập bằng email, mật khẩu hoặc Google.
- Dashboard chỉ hiển thị tiến độ thật của từng tài khoản.
- Danh sách từ vựng theo chủ đề cho tiếng Anh, Nhật và Trung.
- Lật thẻ có phát âm bằng Web Speech API.
- Ghép từ với nghĩa và điền từ theo nghĩa tiếng Việt.
- Tiến độ riêng theo UID: số phiên, từ đã ghi nhớ, điểm tốt nhất và chuỗi ngày luyện.
- Admin CRUD chủ đề/từ vựng; bật hoặc ẩn nội dung mà không qua workflow xuất bản.
- Firebase session cookie phía server và kiểm tra quyền admin ở từng endpoint.

## Công nghệ

- Node.js 24 LTS
- Next.js 16.3 App Router, React 19, TypeScript strict
- Tailwind CSS 4
- Firebase Authentication, Firestore, Storage và Admin SDK
- Zod 4

## Cài đặt

```bash
nvm use
npm install
cp .env.example .env.local
```

Điền cấu hình Firebase Web SDK và Firebase Admin vào `.env.local`. Không commit private key hoặc service-account JSON.

Firebase project cần bật:

1. Authentication với Email/Password và Google.
2. Firestore Database.
3. Storage nếu sau này dùng ảnh/audio tải lên.

Chạy local:

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Khởi tạo nội dung mẫu

Script mới chỉ tạo `vocabularyTopics` và `vocabularyWords`; không tạo tiến độ giả cho người dùng.

Với Firestore Emulator:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:vocabulary
```

Với project thật, phải xác nhận đúng project:

```bash
npm run seed:vocabulary -- --confirm-project="$FIREBASE_ADMIN_PROJECT_ID"
```

Script idempotent: document đã tồn tại sẽ không bị ghi đè.

## Cấp quyền admin

Tài khoản mới có role `user`. Để tạo admin đầu tiên:

```bash
npm run make-admin -- user@example.com
```

Nếu script hiện tại được chạy trực tiếp, có thể dùng:

```bash
node --env-file=.env.local scripts/make-admin.mjs user@example.com
```

Sau khi đăng nhập lại, mục `Quản trị` xuất hiện trong navigation.

## Route chính

```text
/dashboard                         tiến độ và chủ đề nổi bật
/learn                             toàn bộ chủ đề
/learn/[topicId]                   danh sách từ và lựa chọn trò chơi
/learn/[topicId]/practice/[mode]   flashcards | matching | fill
/review                            chọn nhanh chủ đề và trò chơi
/settings                          hồ sơ và tài khoản

/admin                             tổng quan nội dung
/admin/topics                      tạo/sửa/ẩn chủ đề
/admin/topics/[topicId]            quản lý từ trong chủ đề
```

Các màn course, lesson, exam, audit log, source registry và publish workflow không còn thuộc giao diện sản phẩm.

## Kiểm thử

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Kiểm thử Firestore cần Java 21+:

```bash
npm run test:rules
npm run test:vocabulary
```

Chạy toàn bộ quality gate:

```bash
npm run check
```

## Deploy rules và indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Cấu trúc phần từ vựng

```text
src/features/vocabulary/
├── components/                    UI chủ đề, admin và trò chơi
├── schemas/vocabulary.schema.ts   contract dữ liệu
├── seed/starter-vocabulary.ts     dữ liệu mẫu
├── vocabulary-admin.service.ts    mutation admin + transaction wordCount
├── vocabulary-progress.service.ts tiến độ từng người học
├── vocabulary.repository.ts       nguồn đọc chung admin/learner
└── vocabulary-stats.ts            tính chuỗi ngày học
```

Nguyên tắc quan trọng: admin và learner phải dùng cùng `vocabulary.repository`; không tạo thêm draft/revision/source khác cho nội dung từ vựng.
