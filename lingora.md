# Lingora — Tài liệu sản phẩm và kỹ thuật

Phiên bản tài liệu: 2.0
Trạng thái: nguồn sự thật hiện hành
Phạm vi: ứng dụng học từ vựng theo chủ đề

## 1. Mục tiêu sản phẩm

Lingora giúp người học ghi nhớ từ vựng bằng các phiên luyện ngắn. Nội dung được tổ chức theo chủ đề, không theo khóa học nhiều tầng.

Một vòng lặp học hoàn chỉnh:

```text
Chọn chủ đề
→ xem danh sách từ
→ chọn một trò chơi
→ hoàn thành phiên luyện
→ lưu tiến độ cá nhân
→ quay lại luyện tiếp
```

Sản phẩm hiện có ba trò chơi:

1. Lật thẻ.
2. Ghép từ với nghĩa.
3. Điền từ theo nghĩa tiếng Việt.

## 2. Ngoài phạm vi

Các khái niệm sau không thuộc giao diện hay luồng sản phẩm hiện tại:

- Program, course, unit và lesson.
- Đề thi, blueprint, attempt và kết quả thi.
- Draft, validate, review, compile, publish, revision và rollback nội dung.
- Source Registry và yêu cầu nhập source ID.
- Audit Logs trong giao diện quản trị.
- Tự động tạo enrollment hoặc tiến độ mẫu cho tài khoản mới.

Một số service/API cũ có thể còn trong source để tương thích dữ liệu trong giai đoạn chuyển đổi. Chúng không phải nguồn dữ liệu của app từ vựng và không được liên kết từ UI mới.

## 3. Vai trò

### Người học

- Xem chủ đề đang bật hiển thị.
- Xem từ vựng đang bật hiển thị trong chủ đề.
- Chơi ba trò và nghe phát âm bằng Web Speech API.
- Chỉ đọc tiến độ thuộc UID của chính mình.
- Sửa hồ sơ hoặc xóa tài khoản.

### Quản trị viên

- Có toàn bộ quyền của người học.
- Tạo, sửa, ẩn và xóa chủ đề.
- Thêm, sửa, ẩn và xóa từ vựng.
- Xem chính nội dung đó bằng giao diện người học.

Mọi endpoint mutation admin phải kiểm tra session server và `role === "admin"`. Không dựa vào việc nút admin có bị ẩn trên client hay không.

## 4. Luồng xác thực và tài khoản mới

### Đăng ký

```text
Firebase Auth tạo user
→ client lấy ID token
→ POST /api/auth/session
→ server xác minh token
→ tạo hoặc cập nhật users/{uid}
→ đặt HttpOnly session cookie
→ chuyển tới /dashboard
```

Session route chỉ tạo profile. Nó không được tạo:

- `topicProgress`
- `practiceDays`
- enrollment cũ
- lesson progress cũ
- review item cũ
- chuỗi ngày học giả

### Trạng thái bắt buộc của user mới

```text
Chuỗi ngày luyện: 0
Từ đã ghi nhớ: 0
Phiên đã luyện: 0
Tiến độ từng chủ đề: chưa có document
```

Render `GET /dashboard` là thao tác chỉ đọc. Không được seed dữ liệu, tự ghi danh hoặc tự đánh dấu hoàn thành trong Server Component.

## 5. Luồng người học

### Dashboard

Dashboard hiển thị:

- Chuỗi ngày luyện thật từ `practiceDays`.
- Tổng số word ID đã ghi nhớ từ `topicProgress`.
- Tổng số phiên đã luyện.
- Danh sách chủ đề đang hiển thị.
- Tiến độ từng chủ đề: số từ ghi nhớ và số loại trò đã luyện.

Dashboard không hiển thị “hoàn thành khóa học” hoặc “bài đã hoàn thành”.

### Danh sách chủ đề

`/learn` đọc trực tiếp `vocabularyTopics` qua `vocabulary.repository` và chỉ giữ document có `isVisible = true`.

Mỗi card hiển thị:

- Icon.
- Tên và mô tả.
- Ngôn ngữ.
- Số từ đang hiển thị.
- Số trò đã luyện.
- Số từ đã ghi nhớ.

### Chi tiết chủ đề

`/learn/[topicId]` dùng cùng repository để đọc topic và từ. Trang gồm:

- Ba lựa chọn trò chơi.
- Danh sách từ xem trước.
- Phiên âm, nghĩa, ví dụ và nút phát âm nếu có.

Topic bị ẩn hoặc không tồn tại trả trang 404. Word bị ẩn không xuất hiện trong danh sách và không được API tiến độ chấp nhận.

### Luyện tập

Route chung:

```text
/learn/[topicId]/practice/flashcards
/learn/[topicId]/practice/matching
/learn/[topicId]/practice/fill
```

Kết thúc trò chơi, client gửi kết quả tới `POST /api/practice`. UI chỉ báo “đã lưu” sau khi response thành công. Nếu request lỗi, kết quả vẫn hiển thị cục bộ nhưng có nút thử lưu lại.

## 6. Quy tắc ba trò chơi

### Lật thẻ

- Mặt trước: từ và phiên âm.
- Mặt sau: nghĩa, ví dụ và nghĩa ví dụ.
- Người học chọn `Chưa nhớ` hoặc `Đã nhớ`.
- Chọn `Đã nhớ` đưa word ID vào `masteredWordIds` của phiên.
- Tối đa 20 từ trong một phiên hiện tại.

### Ghép từ

- Mỗi phiên dùng tối đa 6 cặp.
- Hai cột chứa từ và nghĩa theo thứ tự khác nhau.
- Cặp sai được trả lại để thử tiếp.
- Phiên chỉ kết thúc khi mọi cặp đã ghép.
- Từ chỉ được coi là ghi nhớ tốt nếu ghép đúng mà chưa từng nằm trong một cặp sai ở phiên đó.

### Điền từ

- Mỗi phiên dùng tối đa 10 từ.
- Prompt chính là nghĩa tiếng Việt.
- Nếu câu ví dụ chứa từ đích, từ đó được thay bằng khoảng trống.
- Chuẩn hóa đáp án bằng Unicode NFKC, chữ thường, khoảng trắng và dấu câu cơ bản.
- Từ trả lời đúng được đưa vào danh sách ghi nhớ tốt của phiên.

Không dùng kết quả game làm chứng chỉ hoặc điểm thi. Đây là tín hiệu học tập cá nhân.

## 7. Luồng quản trị

### Navigation

Admin chỉ có ba mục:

```text
Tổng quan
Chủ đề & từ vựng
Xem như người học
```

Không đưa log kỹ thuật, source, compiler, publish hoặc exam vào navigation.

### Tạo chủ đề

Quản trị viên nhập:

- Tên.
- Mô tả.
- Ngôn ngữ: `en`, `ja` hoặc `zh`.
- Icon.
- Màu.
- Thứ tự.
- Hiển thị/ẩn.

Server tạo slug ổn định từ tên. Nếu slug đã tồn tại, server thêm hậu tố số.

### Quản lý từ

Mỗi từ có:

- Từ hoặc cụm từ.
- Nghĩa tiếng Việt.
- Phiên âm, không bắt buộc.
- Câu ví dụ, không bắt buộc.
- Nghĩa câu ví dụ, không bắt buộc.
- URL ảnh, không bắt buộc.
- Thứ tự.
- Hiển thị/ẩn.

Admin không phải nhập ID, source ID, activity ID hoặc revision ID.

### Lưu là hiển thị

```text
Admin POST/PATCH topic hoặc word
→ schema kiểm tra payload
→ service ghi canonical collection
→ transaction cập nhật wordCount
→ learner repository đọc cùng collection
→ user thấy thay đổi ở lần tải/refresh tiếp theo
```

`isVisible` là trạng thái nội dung duy nhất:

- `true`: learner được đọc.
- `false`: chỉ admin thấy trong màn quản trị.

Không có nút Publish.

## 8. Route map

### Public và auth

| Route | Mục đích |
|---|---|
| `/` | Landing page |
| `/about` | Mô tả sản phẩm |
| `/login` | Đăng nhập |
| `/register` | Tạo tài khoản |
| `/forgot-password` | Khôi phục mật khẩu |

### Người học

| Route | Mục đích |
|---|---|
| `/dashboard` | Thống kê thật và chủ đề nổi bật |
| `/learn` | Danh sách chủ đề |
| `/learn/[topicId]` | Chi tiết chủ đề và từ |
| `/learn/[topicId]/practice/[mode]` | Chơi một game |
| `/review` | Chọn nhanh chủ đề/trò chơi |
| `/settings` | Hồ sơ và tài khoản |

`/onboarding` chỉ redirect về `/learn` để giữ tương thích bookmark cũ.

### Admin

| Route | Mục đích |
|---|---|
| `/admin` | Tổng quan |
| `/admin/topics` | CRUD chủ đề |
| `/admin/topics/[topicId]` | CRUD từ vựng |

## 9. Firestore canonical model

### `vocabularyTopics/{topicId}`

```ts
{
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  languageCode: "en" | "ja" | "zh";
  icon: string;
  accent: "emerald" | "blue" | "violet" | "amber" | "rose" | "cyan";
  order: number;
  isVisible: boolean;
  wordCount: number; // chỉ đếm word đang hiển thị
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `vocabularyWords/{wordId}`

```ts
{
  schemaVersion: 1;
  id: string;
  topicId: string;
  term: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  exampleMeaning: string | null;
  imageUrl: string | null;
  order: number;
  isVisible: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `users/{uid}/topicProgress/{topicId}`

```ts
{
  schemaVersion: 1;
  topicId: string;
  practicedModes: Array<"flashcards" | "matching" | "fill">;
  sessionsCompleted: number;
  correctAnswers: number;
  totalAnswers: number;
  masteredWordIds: string[];
  bestScores: {
    flashcards: number;
    matching: number;
    fill: number;
  };
  totalStudySeconds: number;
  firstPracticedAt: Timestamp;
  lastPracticedAt: Timestamp;
}
```

### `users/{uid}/practiceDays/{yyyy-mm-dd}`

```ts
{
  schemaVersion: 1;
  date: string;
  sessionsCompleted: number;
  studySeconds: number;
  correctAnswers: number;
  totalAnswers: number;
  updatedAt: Timestamp;
}
```

Ngày được tính theo UTC+7. Chuỗi ngày bắt đầu từ hôm nay; nếu hôm nay chưa luyện thì cho phép nối từ hôm qua.

## 10. Định nghĩa tiến độ

### Phiên đã luyện

Một phiên được ghi khi người học đi hết toàn bộ thẻ/cặp/câu của game. Điểm thấp vẫn là một phiên đã luyện, không đồng nghĩa đã thuộc chủ đề.

### Trò đã luyện

`practicedModes` chỉ cho biết người dùng từng hoàn tất một phiên của mode đó. Không dùng tên `completedModes` để tránh hiểu nhầm hoàn thành kiến thức.

### Từ đã ghi nhớ

`masteredWordIds` là tập hợp không trùng của các từ có tín hiệu tốt:

- Flashcards: người học tự chọn `Đã nhớ`.
- Matching: ghép đúng không qua lần ghép sai trong phiên.
- Fill: nhập đúng.

Đây chưa phải SRS đầy đủ. Khi cần SRS, mở rộng bằng `wordProgress/{wordId}`; không nối lại vào `lexemes/reviewItems` cũ.

### Hoàn thành chủ đề

Phiên bản hiện tại không gắn nhãn “hoàn thành chủ đề”. Dashboard chỉ báo số từ ghi nhớ và số trò đã luyện. Cách này tránh lặp lại lỗi tài khoản mới bị coi là hoàn thành toàn bộ.

## 11. API contract

### `POST /api/admin/topics`

```json
{
  "title": "Đồ ăn tiếng Anh",
  "description": "Các món ăn thông dụng",
  "languageCode": "en",
  "icon": "🍜",
  "accent": "amber",
  "order": 3,
  "isVisible": true
}
```

### `PATCH|DELETE /api/admin/topics/[topicId]`

`PATCH` nhận toàn bộ input topic có thể chỉnh. `DELETE` xóa topic và các word của topic theo batch.

### `POST /api/admin/topics/[topicId]/words`

```json
{
  "term": "noodle",
  "meaning": "mì",
  "pronunciation": "/ˈnuː.dəl/",
  "example": "I like noodles.",
  "exampleMeaning": "Tôi thích mì.",
  "imageUrl": "",
  "order": 0,
  "isVisible": true
}
```

### `PATCH|DELETE /api/admin/topics/[topicId]/words/[wordId]`

Mutation word chạy transaction với topic để giữ `wordCount` đúng khi thêm, xóa hoặc đổi visibility.

### `POST /api/practice`

```json
{
  "topicId": "do-an-tieng-anh",
  "mode": "fill",
  "correctAnswers": 4,
  "totalAnswers": 6,
  "studiedWordIds": ["word-1", "word-2"],
  "masteredWordIds": ["word-1"],
  "durationSeconds": 95
}
```

Server xác minh:

- Session hợp lệ.
- Origin hợp lệ.
- Topic đang hiển thị.
- Mọi word ID thuộc topic và đang hiển thị.
- Mastered ID nằm trong studied ID.
- Số câu đúng không lớn hơn tổng số câu.
- Payload không vượt giới hạn kích thước.

## 12. Security

- Firebase private key chỉ tồn tại phía server.
- Session cookie là HttpOnly, SameSite Lax và Secure trong production.
- Admin page và admin API đều xác minh role server-side.
- Client không được ghi trực tiếp catalog hoặc progress qua Firestore Rules.
- User chỉ được đọc document của UID chính mình.
- Mutation kiểm tra origin để giảm CSRF từ site khác.
- Topic/word input dùng Zod strict schema.

## 13. Seed và môi trường

Dữ liệu mẫu gồm 3 chủ đề và 24 từ:

- Chào hỏi tiếng Anh.
- Chào hỏi tiếng Nhật.
- Chào hỏi tiếng Trung.

Chạy:

```bash
npm run seed:vocabulary -- --confirm-project="$FIREBASE_ADMIN_PROJECT_ID"
```

Seed chỉ gọi `createIfMissing`, không ghi đè nội dung admin đã chỉnh và không tạo bất kỳ progress nào.

## 14. Chuyển đổi từ dữ liệu cũ

Các collection cũ như `programs`, `courses`, `publishedLessonRevisions`, `lexemes`, `reviewItems` và `lessonProgress` không còn được dashboard/learn mới đọc.

Vì vậy tài khoản từng bị auto-seed 12 bài, 60 phút và chuỗi 3 ngày sẽ không còn thấy các số giả đó trong UI mới. Dữ liệu cũ có thể được giữ tạm để rollback kỹ thuật hoặc xóa bằng công cụ quản trị sau khi backup.

Không copy trạng thái `completed` cũ sang `topicProgress`.

Nếu migrate nội dung:

1. Nhóm lexeme cũ thành topic rõ ràng.
2. Tạo `vocabularyTopics`.
3. Tạo `vocabularyWords` với `topicId`.
4. Kiểm tra `wordCount` theo số word visible.
5. So sánh màn admin và learner.
6. Chỉ sau đó mới retire dữ liệu course/lesson cũ.

## 15. Kiểm thử và quality gate

### Unit test

```bash
npm test
```

Bao phủ schema topic/word/session, slug tiếng Việt, seed, streak và xóa dữ liệu tài khoản.

### Firestore integration

Yêu cầu Java 21+:

```bash
npm run test:vocabulary
```

Kịch bản kiểm tra:

1. User mới có danh sách progress rỗng.
2. Admin tạo topic và word.
3. Learner repository đọc được ngay.
4. Ghi một phiên flashcard.
5. Progress, mastered ID và wordCount được cập nhật đúng.

### Build gate

```bash
npm run typecheck
npm run lint
npm run build
```

## 16. Tiêu chí nghiệm thu

- [ ] Tài khoản mới vào dashboard thấy 0 ngày, 0 từ, 0 phiên.
- [ ] Mở dashboard không tạo write Firestore.
- [ ] Admin tạo topic visible và một word thì learner thấy sau refresh.
- [ ] Topic hidden không xuất hiện cho learner.
- [ ] Word hidden không xuất hiện trong topic hoặc game.
- [ ] `wordCount` thay đổi đúng khi thêm/xóa/ẩn/hiện word.
- [ ] Flashcard lật được và lưu lựa chọn ghi nhớ.
- [ ] Matching chỉ kết thúc khi ghép hết cặp.
- [ ] Fill chuẩn hóa đáp án và báo đáp án đúng sau khi sai.
- [ ] API từ chối word ID ngoài topic.
- [ ] UI không báo lưu thành công nếu `POST /api/practice` thất bại.
- [ ] Xóa tài khoản xóa cả `topicProgress` và `practiceDays`.
- [ ] Navigation không còn Course, Lesson, Exam, Log, Source hoặc Publish.

## 17. Nguyên tắc phát triển tiếp

1. Một nguồn sự thật cho từ vựng: `vocabularyTopics` và `vocabularyWords`.
2. Game được sinh từ word, không tạo bản sao nội dung riêng cho từng game.
3. Admin lưu là learner đọc được; không tái tạo publish pipeline nếu chưa có yêu cầu thật.
4. Không ghi dữ liệu mẫu trong page render hoặc auth flow.
5. Không dùng thuật ngữ “hoàn thành” nếu chỉ có nghĩa “đã mở/đã đi hết UI”.
6. Mọi số liệu dashboard phải truy được về document của chính UID.
