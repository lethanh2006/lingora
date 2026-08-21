# Lingora Incident Runbook

Tài liệu này dành cho sự cố production của ứng dụng học từ vựng theo chủ đề. Luồng sản phẩm chính thức nằm tại [lingora.md](./lingora.md).

## 1. Phạm vi hệ thống hiện tại

Các thành phần quan trọng:

- Next.js App Router.
- Firebase Authentication.
- Session cookie do Firebase Admin xác minh.
- Firestore.
- Canonical content: `vocabularyTopics`, `vocabularyWords`.
- Learner state: `users/{uid}/topicProgress`, `users/{uid}/practiceDays`.

Các collection course, lesson, exam, publish và source cũ không còn phục vụ UI mới. Không dùng chúng để chẩn đoán số liệu dashboard từ vựng.

## 2. Mức độ sự cố

| Mức | Ví dụ | Phản ứng |
|---|---|---|
| SEV-1 | Không đăng nhập được trên diện rộng, mất/ghi sai dữ liệu nhiều user | Dừng deploy, thông báo ngay, ưu tiên khôi phục |
| SEV-2 | Không lưu được tiến độ, admin sửa nội dung nhưng user không đọc được | Điều tra trong giờ, cân nhắc rollback |
| SEV-3 | Một game lỗi, phát âm không hoạt động, lỗi hiển thị cục bộ | Ghi issue và sửa theo release gần nhất |

## 3. Quy trình chung

1. Ghi thời điểm bắt đầu, môi trường, commit đang deploy và người điều phối.
2. Kiểm tra `/api/health`.
3. Xác định phạm vi: tất cả user, một UID, một topic hay một game.
4. Dừng deploy mới cho tới khi nguyên nhân rõ.
5. Ưu tiên biện pháp có thể hoàn tác: ẩn topic lỗi hoặc rollback deployment.
6. Không xóa Firestore data khi chưa backup và xác nhận chính xác path.
7. Sau khôi phục, chạy checklist tại mục 10.

## 4. Sự cố đăng nhập/session

### Dấu hiệu

```text
POST /api/auth/session 401
app/invalid-credential
request to https://oauth2.googleapis.com/token failed
ETIMEDOUT
```

### Phân loại

- `ETIMEDOUT`: server không kết nối được Google OAuth; thường là mạng/DNS/firewall hoặc sự cố thoáng qua.
- `auth/id-token-expired`: token client hết hạn; yêu cầu đăng nhập lại.
- Zod env error: thiếu hoặc sai `FIREBASE_ADMIN_*`.
- `Invalid origin`: origin request không trùng origin ứng dụng.

### Kiểm tra an toàn

```bash
getent ahosts oauth2.googleapis.com
curl -sS -o /dev/null -w '%{http_code}\n' --connect-timeout 5 --max-time 10 \
  -X POST https://oauth2.googleapis.com/token
```

HTTP `400` từ lệnh POST rỗng vẫn chứng minh endpoint kết nối được. Không in access token hoặc private key vào log.

Kiểm tra service account mà không in token:

```bash
node --env-file=.env.local --input-type=module -e '
import { cert } from "firebase-admin/app";
const credential = cert({
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n")
});
const token = await credential.getAccessToken();
console.log({ ok: Boolean(token.access_token), expiresIn: token.expires_in });
'
```

Nếu kết nối đã phục hồi, restart instance/dev server và thử đăng nhập lại.

## 5. Tài khoản mới có tiến độ không đúng

### Trạng thái đúng

User mới phải có:

- 0 ngày streak.
- 0 từ ghi nhớ.
- 0 phiên luyện.
- Không có document `topicProgress` hoặc `practiceDays`.

### Dấu vân tay dữ liệu giả cũ

- 12 bài hoàn thành.
- 60 phút học.
- Chuỗi 3 ngày.
- 24 từ đến hạn.
- Cả 3 chương trình cũ hoàn thành.

Nguyên nhân cũ là dashboard auto-seed progress trong lúc render. Code mới đã loại bỏ toàn bộ auto-seed và không còn route `/api/dev/seed-mock`.

### Điều tra

Kiểm tra đúng UID:

```text
users/{uid}/topicProgress
users/{uid}/practiceDays
```

Không dùng `lessonProgress`, `dailyStats`, `reviewItems` hoặc `enrollments` cũ để tính dashboard mới.

Nếu dashboard mới vẫn hiện số liệu ngay sau đăng ký:

1. Xác nhận deployment đang chạy commit có dashboard vocabulary mới.
2. Kiểm tra UID session có đúng tài khoản vừa tạo không.
3. Kiểm tra `topicProgress` có được ghi bởi `POST /api/practice` hay tác nhân ngoài ứng dụng không.
4. Tìm log request `POST /api/practice` theo thời gian và UID.

Không xóa profile `users/{uid}` hoặc Firebase Auth user chỉ để reset tiến độ.

## 6. Admin lưu nhưng learner không thấy

### Checklist

1. Topic có `isVisible: true`.
2. Word có `isVisible: true`.
3. Word có đúng `topicId`.
4. `vocabularyTopics/{topicId}.wordCount` khớp số word visible.
5. Admin và learner đang dùng cùng Firebase project/environment.
6. Refresh `/learn`; repository hiện không dùng persistent application cache.

Luồng đúng:

```text
/api/admin/topics...
→ vocabularyTopics/vocabularyWords
→ vocabulary.repository
→ /learn
```

Nếu admin request trả 403, kiểm tra `users/{uid}.role === "admin"` và đăng nhập lại để làm mới session.

## 7. Nội dung sai hoặc cần gỡ khẩn cấp

Không có publish revision để rollback.

Biện pháp nhanh và có thể hoàn tác:

1. Vào `/admin/topics`.
2. Tắt `Hiển thị` cho topic lỗi; hoặc vào topic và ẩn word lỗi.
3. Xác nhận `/learn` không còn hiển thị nội dung.
4. Sửa dữ liệu.
5. Bật hiển thị lại và kiểm tra cả ba game.

Chỉ xóa topic khi chắc chắn không cần khôi phục. Xóa topic cũng xóa toàn bộ word thuộc topic.

## 8. Không lưu được tiến độ game

### Dấu hiệu

- UI kết thúc game nhưng báo “Chưa lưu được kết quả”.
- `POST /api/practice` trả 400/401/404/500.

### Phân loại response

- `400`: payload sai, word không thuộc topic hoặc word đã bị ẩn giữa phiên.
- `401`: session hết hạn.
- `404`: topic đã bị ẩn/xóa giữa phiên.
- `500`: Firestore hoặc transaction lỗi.

### Kiểm tra

1. Xác nhận topic/word còn visible.
2. Xác nhận request không chứa ID trùng hoặc ID ngoài topic.
3. Kiểm tra transaction contention trên:

```text
users/{uid}/topicProgress/{topicId}
users/{uid}/practiceDays/{yyyy-mm-dd}
```

4. Thử nút `Thử lại` ở trang kết quả.
5. Nếu lỗi diện rộng, kiểm tra health và Firestore status trước khi deploy hotfix.

## 9. Backup và rollback

### Trước thay đổi dữ liệu lớn

- Xác nhận đúng project ID.
- Tạo backup/export Firestore bằng công cụ production đã được tổ chức phê duyệt.
- Ghi lại timestamp và người thực hiện.
- Thử restore vào môi trường staging định kỳ.

Các collection tối thiểu cần kiểm tra sau restore:

```text
users
vocabularyTopics
vocabularyWords
```

Với frontend lỗi, rollback về commit/deployment ổn định gần nhất. Sau rollback, không chạy seed production nếu chưa xác nhận seed chỉ `createIfMissing`.

## 10. Checklist sau khôi phục

- [ ] `/api/health` trả trạng thái healthy.
- [ ] Đăng ký tài khoản mới thành công.
- [ ] Dashboard user mới hiển thị 0/0/0.
- [ ] `/learn` hiển thị đúng topic visible.
- [ ] Topic hidden không xuất hiện.
- [ ] Lật thẻ hoàn tất và lưu progress.
- [ ] Ghép từ hoàn tất khi ghép đủ cặp.
- [ ] Điền từ chấp nhận đáp án đúng.
- [ ] Admin tạo một topic/word thử nghiệm ở staging và learner đọc được.
- [ ] Xóa tài khoản xóa cả `topicProgress` và `practiceDays`.
- [ ] Không có private key, token hoặc session cookie trong log/ticket.

## 11. Kiểm thử trước deploy

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Firestore Emulator cần Java 21+:

```bash
npm run test:rules
npm run test:vocabulary
```

Nếu emulator không chạy và báo `spawn java ENOENT`, cài Java 21+ hoặc cấu hình `JAVA_HOME`; không chuyển test sang Firebase production.
