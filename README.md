# Lingora

Base kỹ thuật cho nền tảng học ngôn ngữ, xây dựng bằng Next.js App Router và Firebase. Repo này chỉ chứa infrastructure và các tính năng dùng chung; các module nghiệp vụ như courses, lessons, vocabulary và quizzes sẽ được thêm sau.

## Stack

- Node.js 24 LTS
- Next.js 16 + React 19 + TypeScript strict
- Tailwind CSS 4 + shadcn/ui foundation
- Firebase Authentication, Firestore, Storage và Admin SDK
- Zod 4 cho dữ liệu không tin cậy

## Tính năng base

- Đăng ký, đăng nhập email/password và Google
- Khôi phục mật khẩu qua email
- Firebase ID token đổi thành HttpOnly session cookie phía server
- User profile và hai role `user` / `admin`
- Route Dashboard và Admin được kiểm tra quyền tại server
- Firestore/Storage security rules và cấu hình Emulator Suite
- Error, loading và not-found UI
- Quality gates: typecheck, lint, build

## Cài đặt

Yêu cầu Node.js 24. Nếu dùng nvm:

```bash
nvm use
npm install
```

Tạo Firebase project, sau đó bật:

1. Authentication → Email/Password và Google providers.
2. Firestore Database.
3. Storage.
4. Project Settings → Service accounts → Generate new private key.

Sao chép file env và điền cấu hình Firebase:

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_*` là cấu hình Firebase Web SDK và không phải secret. Các biến `FIREBASE_ADMIN_*` chỉ được dùng phía server; không được commit private key hoặc service-account JSON.

Chạy local:

```bash
npm run dev
```

Mở http://localhost:3000.

## Firebase rules và emulator

Cài Firebase CLI nếu máy chưa có, đăng nhập rồi chọn project:

```bash
npm install --global firebase-tools
firebase login
firebase use --add
```

Chạy emulator:

```bash
firebase emulators:start
```

Chạy bộ kiểm thử Firestore Rules (cần Java 21+):

```bash
npm run test:rules
```

Deploy rules/indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Base hiện khởi tạo tài khoản với role `user`. Để cấp admin lần đầu, chỉnh field `role` của document `users/{uid}` thành `admin` trong Firebase Console. Sau đó chỉ admin mới có quyền đọc/ghi rộng qua Firestore Client SDK; Admin SDK phía server vẫn phải kiểm tra quyền ở từng endpoint.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run build
```

Hoặc chạy toàn bộ:

```bash
npm run check
```

## Cấu trúc chính

```text
src/
├── app/                 routes, layouts, route handlers
├── components/          ui primitives và shared layout
├── features/            code theo feature (auth, user, ...)
└── lib/                 Firebase, session, env và utilities
```

Quy tắc dependency: `app → features → lib`; UI primitives không truy cập Firebase và Firebase Admin không bao giờ được import vào Client Component.

## Tạo project mới từ base

Ưu tiên dùng repository này làm GitHub Template. Nếu clone thủ công, tạo repository/git history mới trước khi phát triển business modules.
