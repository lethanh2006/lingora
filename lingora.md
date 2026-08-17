# Lingora — Product & Technical Blueprint

> Trạng thái: kế hoạch triển khai, chưa phải tài liệu mô tả hệ thống đã hoàn thành.  
> Hướng kiến trúc đã chọn: Firebase-first để ra sản phẩm nhanh.  
> Stack nền: Next.js App Router, React, TypeScript strict, Firebase Auth, Cloud Firestore, Firebase Storage, Admin SDK, Zod và Tailwind CSS.  
> Cập nhật gần nhất: 2026-08-14.

## Cách đọc nhanh

- Phần 1–7: quyết định sản phẩm, phạm vi, user journey và route map.
- Phần 8–17: kiến trúc code, domain, Firestore, security, learning và exam engine.
- Phần 18–20: nội dung ba ngôn ngữ, bản quyền và Admin CMS.
- Phần 21–30: khoảng trống hiện tại, tải, chi phí, test, deploy và vận hành.
- Phần 31–32: roadmap và release milestones.
- Phần 33–47: backlog, permission, Definition of Done, rủi ro, PR plan và go/no-go checklist.

Nếu bắt đầu triển khai ngay, đọc theo thứ tự: Phần 2, 4, 8, 10–15, 21, 31, 42 và 44.

## 1. Mục đích của tài liệu

Tài liệu này là nguồn tham chiếu chung để phát triển Lingora từ base xác thực hiện tại thành nền tảng học và luyện thi ba ngôn ngữ:

- Tiếng Anh.
- Tiếng Nhật.
- Tiếng Trung.

Tài liệu trả lời các câu hỏi:

- MVP phải có gì và cố ý chưa có gì?
- Code được chia feature như thế nào để không biến thành một monolith khó bảo trì?
- Dữ liệu Firestore được tổ chức theo collection/document nào?
- Nội dung công khai, đáp án bí mật và dữ liệu người dùng được tách ra sao?
- Những query nào cần composite index?
- Làm sao kiểm soát số document read/write và khả năng chịu tải?
- Quy trình biên soạn, kiểm duyệt, cấp phép và publish học liệu như thế nào?
- Roadmap cụ thể, thứ tự triển khai và tiêu chí hoàn thành của từng giai đoạn là gì?
- Khi nào Firestore không còn phù hợp và cần xem xét PostgreSQL?

Tài liệu này không thay thế cho:

- Thiết kế UI chi tiết trên Figma.
- Hợp đồng hoặc tư vấn pháp lý về bản quyền.
- Syllabus học thuật đầy đủ cho từng chứng chỉ.
- Runbook vận hành production sau khi đã có hạ tầng thực tế.

## 2. Quyết định kiến trúc chính

### 2.1. Quyết định hiện tại

Trong giai đoạn MVP và beta, Lingora sử dụng:

```text
Browser
  |
  v
Next.js modular monolith
  |-- Firebase Authentication: danh tính và đăng nhập
  |-- Cloud Firestore: nội dung, tiến độ, bài thi và dữ liệu quản trị
  |-- Firebase Storage: audio, hình ảnh và file học liệu
  `-- Firebase Admin SDK: mọi thao tác dữ liệu nhạy cảm ở server
```

Không thêm PostgreSQL, MySQL, MongoDB, Redis, message broker hoặc microservice trong MVP nếu chưa có nhu cầu đo được.

### 2.2. Firebase không có nghĩa là không có backend

Backend của Lingora là phần server của Next.js:

- Server Components đọc dữ liệu cần cho page.
- Route Handlers nhận mutation từ client.
- Service thực thi nghiệp vụ.
- Repository truy cập Firestore qua Admin SDK.
- Firebase session cookie xác thực request.
- Security Rules bảo vệ mọi truy cập trực tiếp qua Client SDK.

Không đặt nghiệp vụ quan trọng trong Client Component hoặc chỉ dựa vào việc ẩn nút trên UI.

### 2.3. Modular monolith

Lingora là một deployment nhưng chia module theo domain. Đây là chủ đích, không phải hạn chế tạm thời.

Lợi ích:

- Một repository và một pipeline deploy.
- Transaction và thay đổi xuyên feature đơn giản hơn microservice.
- Debug và phát triển local dễ hơn.
- Có thể scale ngang nhiều server instance vì server không giữ state trong RAM.
- Khi cần tách background worker hoặc analytics, ranh giới feature đã có sẵn.

### 2.4. Nguyên tắc không thương lượng

1. `app` chỉ điều phối route, layout, metadata và gọi feature.
2. Nghiệp vụ nằm trong `features`.
3. Firebase Admin chỉ được import trong module server-only.
4. Client không nhận đáp án đúng trước khi attempt được chấm.
5. Mọi input không tin cậy phải được Zod validate ở server.
6. Nội dung đã publish là bất biến; chỉnh sửa tạo revision mới.
7. Mọi query production phải có giới hạn và chiến lược pagination.
8. Không query toàn collection để dựng dashboard.
9. Không ghi nhiều người dùng vào cùng một document nóng.
10. Không nhập nội dung vào production nếu chưa rõ nguồn và quyền sử dụng.
11. Không tuyên bố điểm nội bộ tương đương chứng chỉ thật khi chưa được chuẩn hóa.
12. Tối ưu dựa trên số liệu, không dựa trên cảm giác.

## 3. Tầm nhìn sản phẩm

### 3.1. Giá trị cốt lõi

Lingora giúp người Việt:

- Chọn một ngôn ngữ và mục tiêu rõ ràng.
- Học bài ngắn theo lộ trình.
- Luyện từ vựng và kỹ năng theo lịch ôn.
- Làm mini test hoặc mock test có giới hạn thời gian.
- Hiểu điểm mạnh, điểm yếu và biết bài tiếp theo nên học.

### 3.2. Hai hệ thống nghiệp vụ độc lập

#### Learning system

- Chương trình học.
- Course, unit, lesson.
- Hoạt động học.
- Từ vựng và mẫu câu.
- Checkpoint.
- Tiến độ.
- Ôn tập ngắt quãng.

#### Assessment system

- Ngân hàng câu hỏi.
- Exam blueprint.
- Đề thi/version.
- Phiên thi.
- Autosave.
- Chấm điểm.
- Kết quả theo kỹ năng.
- Gợi ý bài học bù lỗ hổng.

Không coi lesson quiz và mock exam là cùng một thứ. Chúng có thể tái sử dụng một số renderer nhưng khác yêu cầu bảo mật, thời gian, scoring và dữ liệu lưu trữ.

### 3.3. Language khác Program

`Language` là ngôn ngữ. `Program` là lộ trình học hoặc luyện thi.

Ví dụ:

```text
Language: English
  |-- Program: General English CEFR
  |-- Program: IELTS Preparation (tương lai)
  `-- Program: TOEIC Preparation (tương lai)

Language: Japanese
  |-- Program: Japanese Communication
  `-- Program: JLPT Preparation

Language: Chinese
  |-- Program: Chinese Communication
  `-- Program: HSK Preparation
```

Không hard-code quy tắc `English = IELTS`, `Japanese = JLPT`, `Chinese = HSK`.

## 4. Phạm vi phiên bản

### 4.1. Technical slice đầu tiên

Mục tiêu đầu tiên không phải hoàn thiện một level. Mục tiêu là chứng minh toàn bộ luồng chạy đúng với cả ba hệ chữ.

Mỗi ngôn ngữ có:

- 1 program.
- 1 course nhập môn.
- 1 lesson reference.
- Mỗi lesson có 6–10 activity.
- Tiến độ được lưu và resume thật.

Technical slice dùng một mini exam kỹ thuật chung để chứng minh attempt, autosave, submit và scoring.

Đề xuất chương trình pilot:

- English: General English CEFR A1.
- Japanese: JF A1, có tag định hướng JLPT N5.
- Chinese: New HSK cấp đầu tiên theo syllabus chính thức hiện hành.

### 4.2. Internal alpha content

Sau technical slice, mở rộng mỗi program thành:

- 1 course.
- 1 unit.
- 4 lesson.
- 1 unit checkpoint.
- 1 mini exam có khoảng 20 câu.
- Audio cho activity listening cần thiết.
- Progress, result và review queue thật.

Inventory dự kiến của alpha:

- 3 programs, 3 courses và 3 units.
- 12 lessons.
- Khoảng 72–120 learning activities.
- 3 unit checkpoints.
- 3 mini exams và khoảng 60 exam questions đã review.
- Khoảng 96–144 mục từ/cụm từ trước khi loại trùng.

### 4.3. MVP learner

MVP learner gồm:

- Đăng ký, đăng nhập, logout, quên mật khẩu.
- Onboarding chọn ngôn ngữ, mục tiêu và thời gian học/ngày.
- Danh sách chương trình và course.
- Course overview và lesson list.
- Lesson player.
- Activity cơ bản.
- Checkpoint cuối bài.
- Lưu và tiếp tục lesson.
- Dashboard tiến độ thật.
- Review queue.
- Mini test/mock test.
- Trang kết quả và xem lại lỗi.
- Settings profile và preference.

### 4.4. MVP content/admin

- Quản lý program/course/unit/lesson.
- Soạn activity và question.
- Upload media.
- Preview.
- Validate.
- Draft/review/publish.
- Source registry và attribution.
- Audit log.

Admin CMS đầy đủ có thể hoàn thiện sau vertical slice, nhưng schema content, validator và publish workflow phải được quyết định trước khi nhập nhiều nội dung.

### 4.5. Ngoài phạm vi MVP

- Payment/subscription.
- Live class và marketplace giáo viên.
- Chat cộng đồng.
- Leaderboard toàn hệ thống.
- AI speaking examiner.
- AI writing band score mang tính chứng nhận.
- Proctoring chống gian lận cấp kỳ thi chính thức.
- Native mobile app.
- Offline-first hoàn chỉnh.
- Microservices.
- Data warehouse realtime.

## 5. Người dùng và quyền

### 5.1. Vai trò

| Role | Quyền chính |
|---|---|
| `user` | Học, ôn, thi, xem dữ liệu của bản thân |
| `editor` | Tạo và sửa nội dung draft, upload media |
| `reviewer` | Review nội dung và yêu cầu chỉnh sửa |
| `admin` | Publish, quản lý role, cấu hình hệ thống và audit |

Base hiện tại chỉ có `user/admin`. Việc thêm `editor/reviewer` thực hiện khi bắt đầu Admin CMS, không cần làm trước vertical slice nếu chỉ một người quản trị nội dung.

### 5.2. Permission thay vì kiểm tra role rải rác

Các service nên gọi permission function có tên theo hành vi:

```text
canReadPublishedContent
canEditDraftContent
canReviewContent
canPublishContent
canManageUsers
canStartAttempt
canReadAttempt
canSubmitAttempt
```

Không viết `if (role === "admin")` lặp lại trong mọi component và route.

### 5.3. Personas chính

#### Learner mới

- Chưa biết trình độ.
- Cần bài ngắn và hướng dẫn tiếng Việt.
- Thường học bằng điện thoại.
- Cần thấy tiến bộ sớm.

#### Learner luyện thi

- Có mục tiêu level/chứng chỉ.
- Cần format đề và thời gian giống kỳ thi.
- Quan tâm điểm theo kỹ năng và câu sai.

#### Content editor

- Không nên cần sửa code hoặc Firestore Console.
- Cần preview trước publish.
- Cần biết nội dung đang dùng nguồn nào.

#### Reviewer/admin

- Cần theo dõi thay đổi.
- Cần ngăn publish nội dung thiếu đáp án/audio/attribution.
- Cần rollback revision.

## 6. Luồng sản phẩm

### 6.1. Onboarding

1. User đăng nhập lần đầu.
2. Chọn ngôn ngữ.
3. Chọn mục tiêu: giao tiếp, học nền tảng hoặc luyện thi.
4. Chọn trình độ hiện tại hoặc làm placement mini test sau này.
5. Chọn mục tiêu phút/ngày.
6. Chọn múi giờ.
7. Server tạo enrollment.
8. Dashboard hiển thị lesson đầu tiên.

Onboarding phải có thể bỏ qua và sửa lại trong Settings.

### 6.2. Học lesson

1. Server lấy published lesson revision.
2. Tạo hoặc tiếp tục learning session.
3. User thực hiện activity theo thứ tự.
4. Client lưu local state tức thời.
5. Client gửi progress theo batch/debounce.
6. Checkpoint được chấm.
7. Server tính completion.
8. Server cập nhật lesson progress, aggregate và review queue.
9. UI hiển thị recap và next action.

Không đánh dấu hoàn thành chỉ vì user mở page hoặc scroll đến cuối.

### 6.3. Ôn tập

1. Query tối đa N item có `nextReviewAt <= now`.
2. Trộn item theo language/skill hợp lý.
3. User trả lời.
4. Server cập nhật lịch ôn.
5. UI hiển thị số item còn lại.
6. Khi hết queue, đề xuất lesson hoặc mini test.

### 6.4. Làm bài thi

1. User chọn đề.
2. Server kiểm tra enrollment và giới hạn tạo attempt.
3. Server chọn hoặc tải exam form theo blueprint.
4. Server tạo attempt với `startedAt` và `expiresAt`.
5. Client nhận prompt/options đã loại scoring secret.
6. Client autosave theo section.
7. Server khóa attempt khi submit hoặc hết giờ.
8. Server chấm điểm idempotent.
9. Result được lưu cùng version câu hỏi.
10. User xem breakdown và giải thích được phép hiển thị.

### 6.5. Publish nội dung

1. Editor tạo draft.
2. Validator kiểm tra cấu trúc.
3. Editor preview.
4. Reviewer kiểm tra ngôn ngữ và đáp án.
5. Admin approve.
6. Publish service biên dịch draft thành immutable read model.
7. Cập nhật pointer `currentPublishedRevisionId` bằng transaction.
8. Invalidate cache theo tag/version.
9. Ghi audit log.

## 7. Route map dự kiến

### 7.1. Learner pages

```text
/dashboard
/learn
/learn/[programId]
/learn/[programId]/courses/[courseId]
/learn/[programId]/lessons/[lessonId]
/review
/exams
/exams/[examId]
/attempts/[attemptId]
/results/[attemptId]
/settings
```

### 7.2. Admin pages

```text
/admin
/admin/programs
/admin/courses
/admin/courses/[courseId]
/admin/lessons/[lessonId]
/admin/questions
/admin/questions/[questionId]
/admin/exams
/admin/sources
/admin/review-queue
/admin/audit-logs
```

### 7.3. Route Handlers

Tên endpoint cuối cùng có thể thay đổi, nhưng ranh giới nghiệp vụ nên tương tự:

```text
POST   /api/enrollments
PATCH  /api/enrollments/[programId]

POST   /api/learning/sessions
PUT    /api/learning/sessions/[sessionId]/progress
POST   /api/lessons/[lessonId]/complete

GET    /api/reviews/due
POST   /api/reviews/[reviewItemId]/answer

POST   /api/attempts
GET    /api/attempts/[attemptId]
PUT    /api/attempts/[attemptId]/sections/[sectionId]
POST   /api/attempts/[attemptId]/submit

POST   /api/admin/content/validate
POST   /api/admin/content/publish
POST   /api/admin/media/upload-url
```

Mutation endpoint phải:

- Kiểm tra origin/CSRF phù hợp.
- Xác thực session.
- Kiểm tra permission.
- Parse body bằng Zod.
- Gọi service.
- Dùng transaction/idempotency khi cần.
- Trả error code ổn định, không lộ stack hoặc dữ liệu nhạy cảm.

## 8. Kiến trúc source code

### 8.1. Cấu trúc mục tiêu

```text
src/
|-- app/
|   |-- (public)/
|   |-- (auth)/
|   |-- (app)/
|   |   |-- dashboard/
|   |   |-- learn/
|   |   |-- review/
|   |   |-- exams/
|   |   `-- settings/
|   |-- admin/
|   `-- api/
|       |-- auth/
|       |-- user/
|       |-- learning/
|       |-- reviews/
|       |-- attempts/
|       `-- admin/
|-- components/
|   |-- ui/
|   `-- layout/
|-- features/
|   |-- auth/
|   |-- user/
|   |-- catalog/
|   |-- learning/
|   |-- vocabulary/
|   |-- review/
|   |-- assessment/
|   |-- progress/
|   `-- content-admin/
`-- lib/
    |-- auth/
    |-- firebase/
    |-- content/
    |-- observability/
    |-- validation/
    `-- utils/
```

### 8.2. Cấu trúc một feature

```text
features/assessment/
|-- components/             # UI dành riêng cho assessment
|-- schemas/                # Zod input/output schemas
|-- server/
|   |-- assessment.repository.ts
|   |-- assessment.service.ts
|   |-- attempt.service.ts
|   `-- scoring/
|       |-- scoring-strategy.ts
|       |-- objective-scoring.ts
|       `-- normalizers/
|-- types.ts
|-- constants.ts
`-- utils.ts                # pure functions dùng được cả client/server
```

Không bắt buộc tạo mọi file ngay từ đầu. Chỉ tạo khi có trách nhiệm thật.

### 8.3. Dependency rule

```text
app --> features --> lib
  \          |
   `------> components/ui
```

- `app` có thể import `features`, `components`, `lib`.
- `features` có thể import `lib` và shared UI.
- Feature không import nội bộ feature khác bằng đường dẫn sâu; dùng public export hoặc service boundary rõ ràng.
- `components/ui` không import Firebase hoặc feature nghiệp vụ.
- Client Component không import file có `server-only`.
- Repository không import React.
- Schema validation không phụ thuộc database.

### 8.4. Trách nhiệm từng lớp

#### Page/Route

- Đọc params/search params.
- Xác thực cấp route nếu cần.
- Gọi service/query.
- Render state hoặc map lỗi sang HTTP response.

#### Component

- Hiển thị và tương tác UI.
- Không tự quyết định quyền.
- Không chứa scoring chính thức.
- Không tự ghi Firestore business data.

#### Schema

- Validate request, imported content và dữ liệu đọc từ nguồn ngoài.
- Dùng discriminated union cho activity/question type.
- Tách schema create/update/public response.

#### Service

- Thể hiện use case: `startAttempt`, `submitAttempt`, `publishLesson`.
- Kiểm tra invariant và state transition.
- Điều phối repository, transaction và audit.

#### Repository

- Chuyển đổi domain object sang Firestore document và ngược lại.
- Giữ query ở một nơi có tên rõ nghĩa.
- Không chứa logic UI.
- Không trả raw Firestore snapshot ra ngoài feature.

### 8.5. Không tạo generic repository quá sớm

Tránh API kiểu:

```text
repository.get(collection, id)
repository.list(collection, filters)
```

Ưu tiên API thể hiện nhu cầu:

```text
getPublishedLessonRevision(lessonRevisionId)
listDueReviewItems(uid, now, limit)
findQuestionCandidates(blueprintSlot)
saveAttemptSection(uid, attemptId, section)
```

Điều này giúp đổi database sau này mà service không phụ thuộc cú pháp Firestore.

## 9. Quy ước dữ liệu chung

### 9.1. ID

- Dùng Firestore auto ID cho entity có tốc độ tạo cao như attempts và audit logs.
- Dùng slug ổn định cho catalog ít thay đổi khi có lợi, ví dụ `en`, `ja`, `zh`.
- Không dùng ID tăng dần cho collection có nhiều write.
- Không đưa email hoặc dữ liệu cá nhân vào document path.
- Stable entity ID và revision ID là hai giá trị khác nhau.

Ví dụ:

```text
lessonId: lesson-ja-n5-greetings
lessonRevisionId: auto-generated immutable ID
```

### 9.2. Timestamp

- Dùng Firestore Timestamp/server timestamp, không tin thời gian client cho nghiệp vụ.
- Mọi mutable document có `createdAt`, `updatedAt`.
- Published revision có `publishedAt`, `publishedBy`.
- Attempt có `startedAt`, `expiresAt`, `submittedAt`.
- Lịch học dùng UTC timestamp; streak dùng timezone đã lưu của user.

### 9.3. Version

Các loại version không được trộn:

- `schemaVersion`: hình dạng document.
- `contentRevision`: phiên bản nội dung.
- `frameworkVersion`: phiên bản CEFR/JLPT/HSK được tham chiếu.
- `scoringVersion`: phiên bản thuật toán chấm.
- `schedulerVersion`: phiên bản thuật toán ôn tập.

Kết quả thi phải lưu version được sử dụng tại thời điểm chấm.

### 9.4. Trạng thái nội dung

```text
draft
  -> in_review
  -> approved
  -> published
  -> retired
```

Các transition không hợp lệ phải bị service từ chối. Ví dụ editor không được chuyển thẳng `draft -> published`.

### 9.5. Soft delete

- Nội dung đã từng được user học/thi không hard-delete khỏi database thường xuyên.
- Dùng `retiredAt`, `retiredBy` hoặc trạng thái `retired`.
- Dữ liệu user chỉ xóa theo quy trình account deletion và retention policy.
- Media chưa được tham chiếu có thể được dọn bởi job có dry-run và audit.

## 10. Domain model

### 10.1. Language

```text
Language
- id: en | ja | zh
- nameVi
- nativeName
- locale
- writingSystems[]
- direction: ltr | rtl
- enabled
- order
```

### 10.2. Program

```text
Program
- id
- languageId
- code
- type: general | exam_prep | placement
- title
- description
- frameworkCode
- frameworkVersion
- levelIds[]
- currentPublishedRevisionId
- status
- order
- createdAt
- updatedAt
```

### 10.3. Course, Unit và Lesson

```text
Course
- id
- programId
- levelId
- title
- description
- coverMediaId
- estimatedMinutes
- currentPublishedRevisionId
- status

CourseRevision
- id
- courseId
- revisionNumber
- orderedUnitIds[]
- lessonRevisionMap
- releaseNotes
- publishedAt
- publishedBy

UnitDraft
- id
- courseId
- title
- description
- order
- status

LessonDraft
- id
- unitId
- title
- summary
- objectives[]
- estimatedMinutes
- order
- activities[] hoặc activityRefs[]
- vocabularyRefs[]
- sourceRefs[]
- status
- validationReport
```

### 10.4. Published lesson read model

Authoring data có thể chuẩn hóa thành nhiều document để editor dễ sửa. Learner không nên đọc từng activity riêng lẻ. Khi publish, hệ thống biên dịch lesson thành snapshot bất biến:

```text
PublishedLessonRevision
- id
- lessonId
- courseId
- unitId
- programId
- languageId
- revisionNumber
- title
- summary
- objectives[]
- estimatedMinutes
- activities[]
- vocabulary[]
- mediaManifest[]
- sourceAttributions[]
- checksum
- schemaVersion
- publishedAt
```

Mục tiêu là mở một lesson bằng một document read trong trường hợp snapshot nhỏ hơn giới hạn Firestore. Nếu lesson quá lớn:

- Chia theo section thành số chunk nhỏ cố định.
- Manifest cho biết ordered chunk IDs.
- Không chia mỗi activity thành một read nếu learner luôn cần toàn bộ lesson.

### 10.5. Activity

Activity dùng discriminated union theo `type`.

Các loại P0:

```text
explanation
vocabulary_card
single_choice
gap_fill
reorder_tokens
listening_choice
```

Các loại P1:

```text
multiple_choice
matching
true_false
dictation
reading_set
speaking_recording
```

Field chung:

```text
- id
- type
- instruction
- prompt
- skill
- difficulty
- estimatedSeconds
- required
- sourceRefs[]
```

Scoring definition không bắt buộc nằm trong published lesson payload. Với checkpoint nhạy cảm, server giữ scoring riêng.

### 10.6. Lexeme

Không ép ba ngôn ngữ vào một field duy nhất.

Field chung:

```text
- id
- languageId
- lemma
- partOfSpeech
- meaningsVi[]
- examples[]
- mediaRefs[]
- frameworkRefs[]
- sourceRefs[]
- status
- sourceVersion
```

English extension:

```text
- phonetic
- variants[]
- inflections[]
```

Japanese extension:

```text
- surface
- kana
- reading
- romaji
- pitchAccent (optional, có nguồn rõ ràng)
- kanjiRefs[]
```

Chinese extension:

```text
- simplified
- traditional
- pinyinMarked
- pinyinNumbered
- classifier
- characterRefs[]
```

### 10.7. Question

Ngân hàng câu hỏi dùng stable ID và immutable version:

```text
Question
- id
- latestVersionId
- status
- createdAt
- updatedAt

QuestionVersion
- id
- questionId
- programId
- frameworkVersion
- levelId
- sectionType
- skill
- interactionType
- difficulty
- topicIds[]
- objectiveIds[]
- promptBlocks[]
- options[]
- mediaRefs[]
- scoringDefinition
- explanation
- sourceRefs[]
- authorUid
- reviewerUid
- status
- version
- createdAt
```

API trả `QuestionPublicPayload`, tuyệt đối không serialize nguyên `QuestionVersion`.

### 10.8. Exam blueprint và exam form

```text
ExamBlueprint
- id
- programId
- frameworkVersion
- levelId
- title
- sections[]
- durationSeconds
- scoringStrategy
- scoringVersion
- status

BlueprintSection
- id
- title
- order
- durationSeconds
- slots[]

BlueprintSlot
- skill
- interactionTypes[]
- difficultyRange
- topicConstraints
- questionCount
- points
```

Khi traffic tăng, có thể pre-generate `ExamFormVersion`:

```text
ExamFormVersion
- id
- blueprintId
- blueprintVersion
- orderedQuestionVersionIds[]
- publicSectionSnapshots[]
- checksum
- status
- publishedAt
```

Pre-generated form giảm số query và số document read khi nhiều user bắt đầu thi cùng lúc.

### 10.9. Attempt

```text
Attempt
- id
- uid
- examFormVersionId
- blueprintId
- programId
- levelId
- state: in_progress | submitted | expired | graded | invalidated
- startedAt
- expiresAt
- submittedAt
- gradedAt
- currentSectionId
- scoringVersion
- totalRawScore
- totalPercent
- skillScores
- questionVersionIds[]
- createdAt
- updatedAt
```

Đáp án nên được chia theo section thay vì ghi mỗi phím bấm vào attempt document:

```text
attempts/{attemptId}/sections/{sectionId}
- answers: map<questionVersionId, answerPayload>
- flaggedQuestionIds[]
- lastSavedAt
- clientRevision
- serverRevision
```

Ưu điểm:

- Giảm write amplification.
- Tránh một attempt document quá lớn.
- Retry theo section dễ hơn.
- Có optimistic concurrency bằng revision.

### 10.10. Progress và enrollment

```text
Enrollment
- programId
- currentCourseId
- currentLessonId
- targetLevelId
- goalType
- dailyGoalMinutes
- status: active | paused | completed
- enrolledAt
- lastActivityAt

LessonProgress
- lessonId
- lessonRevisionId
- status: not_started | in_progress | completed
- masteryStatus: not_assessed | needs_review | mastered
- completedRequiredCount
- requiredActivityCount
- lastActivityId
- boundedActivityState (optional, chỉ chứa activity của một revision)
- checkpointScore
- bestCheckpointScore
- timeSpentSeconds
- startedAt
- completedAt
- lastActivityAt
```

`lessonRevisionId` giúp biết user đã hoàn thành nội dung phiên bản nào.

Không dùng một array tăng vô hạn cho toàn bộ lịch sử activity. Chi tiết event dài hạn thuộc analytics/event store; progress document chỉ giữ state hiện tại có kích thước bị chặn bởi số activity của một lesson revision.

### 10.11. Review item

```text
ReviewItem
- id
- uid
- programId
- languageId
- targetType: lexeme | grammar | question
- targetId
- state: new | learning | review | mastered | suspended
- dueAt
- intervalDays
- ease
- correctStreak
- lapseCount
- lastReviewedAt
- schedulerVersion
- createdAt
- updatedAt
```

Thuật toán đặt sau interface `ReviewScheduler`. MVP có thể dùng thuật toán đơn giản; thay bằng FSRS sau khi có dữ liệu mà không đổi UI.

### 10.12. Source registry

```text
Source
- id
- title
- publisher
- canonicalUrl
- sourceType
- version
- retrievedAt
- licenseCode
- licenseUrl
- attributionText
- commercialUseAllowed
- derivativeUseAllowed
- redistributionAllowed
- shareAlikeRequired
- notes
- status
```

Mỗi nội dung dẫn xuất phải giữ `sourceRefs`. Không chỉ ghi nguồn trong spreadsheet ngoài hệ thống.

Public attribution được project từ registry bằng allowlist:

```text
SourceAttribution
- id
- title
- publisher
- canonicalUrl
- licenseCode
- licenseUrl
- attributionText
```

Không đưa review notes, contact nội bộ hoặc đánh giá pháp lý chưa công bố vào learner payload.

## 11. Firestore physical design

### 11.1. Phân nhóm collection

#### Public/read-mostly catalog

```text
languages/{languageId}
programs/{programId}
courses/{courseId}
publishedCourseRevisions/{courseRevisionId}
publishedLessonRevisions/{lessonRevisionId}
lexemes/{lexemeId}
examCatalog/{examId}
sourceAttributions/{sourceId}
```

`public` ở đây nghĩa là payload an toàn để learner đã đăng nhập đọc, không có nghĩa tất cả website bên ngoài được phép đọc.

#### Private authoring content

```text
contentCourses/{courseId}
contentUnits/{unitId}
contentLessons/{lessonId}
contentActivities/{activityId}
questions/{questionId}
questionVersions/{questionVersionId}
examBlueprints/{blueprintId}
examFormVersions/{examFormVersionId}
contentSources/{sourceId}
```

Client learner không đọc trực tiếp nhóm này. Admin CMS cũng ưu tiên thao tác qua server API thay vì mở rộng Firestore Client rules.

`contentSources` chứa đánh giá license/notes nội bộ. `sourceAttributions` chỉ chứa DTO an toàn cần hiển thị công khai; publish service sinh public attribution từ private registry.

#### User-owned state

```text
users/{uid}
users/{uid}/enrollments/{programId}
users/{uid}/lessonProgress/{lessonId}
users/{uid}/reviewItems/{reviewItemId}
users/{uid}/dailyStats/{yyyy-mm-dd}
users/{uid}/attempts/{attemptId}
users/{uid}/attempts/{attemptId}/sections/{sectionId}
```

Đặt attempt dưới user giúp:

- Query lịch sử của một user tự nhiên.
- Security ownership rõ ràng.
- Tránh index `uid` cho phần lớn query cá nhân.

Khi admin cần báo cáo toàn hệ thống có thể dùng collection-group query hoặc export sang hệ analytics sau này.

#### Operational data

```text
auditLogs/{auditLogId}
idempotencyKeys/{keyHash}
rateLimits/{bucketId}
publishJobs/{jobId}
systemConfig/{configId}
```

Không dùng Firestore như một job queue phức tạp. `publishJobs` chỉ phù hợp job ngắn, ít trạng thái; công việc dài hoặc retry phức tạp sẽ chuyển sang managed task/queue khi xuất hiện nhu cầu.

### 11.2. Server-owned access

Kiến trúc khuyến nghị cho business data:

- Browser dùng Firebase Client SDK cho Authentication.
- Browser không dùng Client SDK để ghi progress, attempts hoặc content.
- Server Components và Route Handlers dùng Firebase Admin SDK.
- Mọi server mutation tự kiểm tra user và permission vì Admin SDK bypass Security Rules.
- Firestore Rules mặc định deny client write.

Lợi ích:

- Không lộ scoring data.
- Validation tập trung.
- Dễ rate limit và audit.
- Dễ chuyển repository sang database khác.
- Tránh viết Security Rules quá phức tạp.

Trade-off:

- Không có offline write/realtime miễn phí từ Client SDK.
- Mọi mutation đi qua Next.js compute.
- Phải xây autosave/retry rõ ràng.

Trade-off này phù hợp web học và thi hơn việc cho client ghi tự do.

### 11.3. Published read model

Authoring model tối ưu cho chỉnh sửa; published model tối ưu cho đọc.

```text
Draft lesson
  |-- nhiều activity document
  |-- media refs
  |-- source refs
  `-- validation metadata
          |
          | publish compiler
          v
PublishedLessonRevision
  |-- learner-safe activity payload
  |-- embedded vocabulary cần hiển thị
  |-- resolved media manifest
  |-- attribution
  `-- không có secret answer của secure checkpoint
```

Quy trình publish phải kiểm tra document size. Không cố nhét snapshot vượt giới hạn; chia chunk theo section khi cần.

### 11.4. Denormalization có kiểm soát

Có thể duplicate các field phục vụ read model:

- `programId` trên course, lesson và question.
- `languageId` trên published lesson.
- `courseTitle` trong course manifest nếu UI luôn cần.
- `skillScores` summary trong attempt.

Mỗi field duplicate phải có:

- Một nguồn sự thật rõ ràng.
- Một service chịu trách nhiệm cập nhật.
- Test hoặc validator phát hiện lệch dữ liệu.

Không dual-write tùy tiện từ client.

### 11.5. Document size budget

Giới hạn nội bộ nên thấp hơn hard limit Firestore để có chỗ cho metadata:

| Document | Budget đề xuất |
|---|---:|
| Published lesson snapshot | dưới 500 KiB |
| Attempt metadata | dưới 100 KiB |
| Attempt section answers | dưới 200 KiB |
| Course manifest | dưới 200 KiB |
| User profile | dưới 20 KiB |

Nếu vượt budget, chia document theo ranh giới nghiệp vụ, không cắt byte tùy ý.

## 12. Query inventory và index plan

### 12.1. Nguyên tắc

1. Viết query inventory trước khi tạo index.
2. Mỗi query có owner feature, màn hình sử dụng, giới hạn và index tương ứng.
3. Dùng cursor pagination; không dùng offset cho danh sách tăng lớn.
4. Query learner luôn có `limit` hợp lý.
5. Field equality đứng trước field sort/range trong composite index.
6. Không tạo mọi tổ hợp filter cho admin search.
7. Index phải nằm trong `firestore.indexes.json` và được review như code.
8. Field không query cần được cân nhắc index exemption.

### 12.2. Query dự kiến

| ID | Use case | Query | Composite index dự kiến |
|---|---|---|---|
| Q01 | Admin liệt kê unit | `courseId ==`, `status ==`, `order asc` | `courseId ASC, status ASC, order ASC` |
| Q02 | Admin liệt kê lesson | `unitId ==`, `status ==`, `order asc` | `unitId ASC, status ASC, order ASC` |
| Q03 | Admin review queue | `status == in_review`, `updatedAt asc` | `status ASC, updatedAt ASC` |
| Q04 | User xem attempt gần nhất | trong subcollection user: `state in (...)`, `startedAt desc` | `state ASC, startedAt DESC` |
| Q05 | User lấy review đến hạn | `state in (...)`, `dueAt <= now`, `dueAt asc` | `state ASC, dueAt ASC` |
| Q06 | Chọn question candidate | `programId ==`, `levelId ==`, `skill ==`, `status ==`, `difficulty asc` | `programId ASC, levelId ASC, skill ASC, status ASC, difficulty ASC` |
| Q07 | Audit theo entity | `entityType ==`, `entityId ==`, `createdAt desc` | `entityType ASC, entityId ASC, createdAt DESC` |
| Q08 | Audit theo actor | `actorUid ==`, `createdAt desc` | `actorUid ASC, createdAt DESC` |

`ASC` trên equality field chủ yếu để định nghĩa index; hướng quan trọng nhất là field `orderBy`.

### 12.3. Không để question filter tạo index explosion

Nếu admin cho phép kết hợp tùy ý:

```text
language + program + level + skill + topic + type + status + difficulty + author
```

thì số composite index có thể tăng rất nhanh.

Chiến lược:

- Chỉ hỗ trợ một số filter combination có chủ đích.
- Dùng `poolId` được tính khi approve question.
- Dùng server-side post-filter trên tập candidate nhỏ có giới hạn khi phù hợp.
- Pre-generate exam forms.
- Dùng search service riêng nếu nhu cầu full-text/faceted search thực sự xuất hiện.

Không biến Firestore thành Elasticsearch bằng cách tạo n-gram field khổng lồ.

### 12.4. Index exemption dự kiến

Các field thường không cần automatic index:

```text
promptBlocks
contentBlocks
explanation
transcript
scoringDefinition
answers
translations
validationReport
sourceNotes
mediaManifest
```

Riêng array/map cần đặc biệt chú ý vì automatic indexing có thể tạo nhiều index entry.

Không exempt field nếu có query thật dựa vào nó, ví dụ `tags array-contains`.

### 12.5. Theo dõi index

Với mỗi query quan trọng:

- Seed dữ liệu gần kích thước production.
- Chạy Query Explain.
- Theo dõi `index_entries_scanned`, `documents_scanned`, latency và billable reads.
- So sánh trước/sau thay đổi index.
- Ghi kết luận vào performance note hoặc PR.

Index tồn tại nhưng scan quá rộng vẫn có thể tốn tiền và chậm.

## 13. Read/write budget

### 13.1. Mục tiêu ban đầu trên mỗi hành động

Đây là budget thiết kế, không phải số đo đã đạt:

| Hành động | Read mục tiêu | Write mục tiêu |
|---|---:|---:|
| Mở dashboard | 3–6 | 0 |
| Mở course overview | 1–3 | 0 |
| Mở lesson | 1–3 | 1 tối đa để tạo session |
| Hoàn thành một lesson | 0–3 | 2–5 theo batch/transaction |
| Lấy 30 review item | 30 hoặc ít hơn | 0 |
| Trả lời một review item | 0–1 | 1 |
| Autosave một exam section | 0–1 | 1 |
| Submit attempt | phụ thuộc số question chưa cache | 2–N trong transaction/batch |

Sau khi có implementation, thay budget giả định bằng số đo thật.

### 13.2. Giảm read

- Compile lesson thành immutable snapshot.
- Cache catalog/course manifest theo revision.
- Không dựng dashboard bằng cách đọc toàn bộ lesson progress.
- Lưu aggregate `totalLessonsCompleted`, `totalStudySeconds`, `currentStreak` trong user summary.
- Dùng projection/public DTO hợp lý nhưng nhớ rằng Firestore Standard tính document read, không phải số field trả về.
- Pre-generate exam form khi số lần start test lớn.
- Không mở realtime listener cho dữ liệu không cần realtime.

### 13.3. Giảm write

- Debounce autosave.
- Lưu answer map theo section thay vì mỗi ký tự.
- Batch cập nhật progress liên quan.
- Chỉ cập nhật `lastSeenAt` với tần suất có giới hạn.
- Không tăng global counter trên một document.
- Không ghi analytics event thô vào Firestore từ client; dùng hệ analytics phù hợp.

### 13.4. Cache

Phân loại:

#### Cache dài

- Published lesson revision bất biến.
- Media có version/hash trong path.
- Exam catalog revision.

#### Cache ngắn hoặc revalidate theo tag

- Program list.
- Course current revision pointer.
- Public dashboard announcements.

#### Không shared-cache

- User profile.
- Review queue.
- Attempt và result cá nhân.
- Admin draft.

Cache key luôn chứa revision hoặc user identity phù hợp để tránh trả nhầm dữ liệu.

## 14. Security model

### 14.1. Authentication

- Firebase Client SDK đăng nhập.
- ID token được đổi thành HttpOnly session cookie ở server.
- Cookie dùng `Secure` trên production, `HttpOnly`, `SameSite` phù hợp.
- Server xác minh session ở mọi protected use case.
- Không tin UID, role hoặc email do client gửi trong JSON body.

### 14.2. Authorization

- Server lấy user hiện tại từ session.
- Ownership lấy từ path/document ở server, không lấy từ body.
- Permission check nằm trước repository mutation.
- Admin action ghi actor UID vào audit log.
- Role thay đổi phải có quy trình invalidate/refresh session phù hợp.

### 14.3. Firestore Rules

Định hướng Rules:

- Published learner-safe content: cho authenticated user đọc nếu cần direct access.
- Question bank, scoring definition, draft: deny learner.
- Business writes từ client: deny mặc định.
- User chỉ đọc dữ liệu chính mình nếu có direct read.
- Client không được tự nâng role.

Rules không thể che riêng một vài field khi client đọc document. Nếu document có `correctAnswer`, learner đọc được document cũng sẽ đọc được field đó; vì vậy public/private payload phải nằm ở document/collection khác hoặc chỉ được trả qua server sanitizer.

Rules của parent path không tự động áp dụng cho subcollection. Mỗi vùng dữ liệu phải có match/test rõ ràng và cuối cùng là default deny.

Quan trọng: Admin SDK bypass Rules. Vì vậy server service vẫn phải tự authorize; Rules không bảo vệ route viết sai.

### 14.4. Storage Rules

Path gợi ý:

```text
media/content/{contentId}/{revision}/{fileName}
media/questions/{questionId}/{revision}/{fileName}
media/users/{uid}/recordings/{recordingId}
```

- Learner đọc published media.
- User chỉ upload/read recording của mình.
- Editor upload content qua controlled flow.
- Validate MIME type, extension, size và metadata.
- Không dùng tên file do user cung cấp làm path trực tiếp.
- Speaking recording có retention policy và nút xóa.

### 14.5. API protection

- Kiểm tra origin cho state-changing request.
- Rate limit login-sensitive và attempt endpoints.
- Có idempotency key cho submit/publish.
- Giới hạn request body.
- Không trả raw error từ Firebase.
- Log error với request ID, không log token/cookie/đáp án người dùng không cần thiết.
- Cân nhắc Firebase App Check khi public beta.

App Check chỉ giúp giảm abuse từ client không hợp lệ; nó không thay thế Authentication, Authorization hoặc rate limiting.

### 14.6. Exam data

- Correct answer và scoring rubric ở private collection.
- Payload câu hỏi phải được xây bằng allowlist field.
- Submit dùng server time.
- Attempt đã submitted không được sửa answer.
- Hai request submit đồng thời chỉ sinh một kết quả.
- Kết quả lưu question/scoring version.
- Practice app không tuyên bố chống gian lận tuyệt đối.

## 15. Consistency và transaction

### 15.1. State transition

Ví dụ attempt:

```text
in_progress -> submitted -> graded
in_progress -> expired -> graded
submitted   -X-> in_progress
graded      -X-> submitted
```

Transaction kiểm tra state hiện tại trước khi ghi state mới.

### 15.2. Idempotency

Các action phải idempotent:

- Submit attempt.
- Complete lesson.
- Publish revision.
- Import content batch.
- Webhook tương lai.

Mỗi request quan trọng có request/idempotency key hoặc dựa trên document ID ổn định. Retry không được cộng điểm, streak hoặc progress hai lần.

### 15.3. Aggregate

Khi hoàn thành lesson, transaction có thể cập nhật:

- Lesson progress.
- Enrollment current position.
- Daily stats.
- User summary.
- Review items mới.

Nếu số write vượt giới hạn hoặc transaction trở nên dễ contention:

- Giữ dữ liệu chính xác cốt lõi trong transaction.
- Chuyển aggregate có thể rebuild sang event/job idempotent.
- Không làm request learner chờ báo cáo analytics.

### 15.4. Tránh contention

- State người dùng nằm dưới UID nên write phân tán tự nhiên.
- Dùng auto ID cho attempts/audit.
- Không tạo timestamp làm document ID tăng dần cho high-write collection.
- Không có một global streak/stat counter.
- Question usage counter có thể shard hoặc cập nhật bất đồng bộ khi traffic đủ lớn.

## 16. Learning engine

### 16.1. Lesson contract

Mỗi lesson phải có:

- Một hoặc nhiều learning objective đo được.
- Kiến thức đầu vào nếu có.
- Danh sách activity theo thứ tự.
- Activity bắt buộc và tùy chọn.
- Điều kiện hoàn thành.
- Nội dung recap.
- Mapping đến review item.
- Source/author/reviewer.

### 16.2. Completion rule

MVP đề xuất tách completion khỏi mastery:

```text
completed =
  tất cả required activity đã được xem/thực hiện
  AND checkpoint đã được submit

mastered =
  completed
  AND checkpoint score >= masteryThreshold của lesson revision
```

Nếu hoàn thành nhưng chưa đạt mastery:

- Lesson vẫn `completed` để user không bị khóa lộ trình.
- `masteryStatus = needs_review`.
- User được xem lại giải thích.
- Cho phép retry checkpoint.
- Lưu best score và attempt count, không chỉ score cuối.
- Tạo review item cho objective yếu.

### 16.3. Progress event

Client không gửi “tôi đã hoàn thành”. Client gửi evidence:

```text
- sessionId
- lessonRevisionId
- activityId
- response
- elapsedSeconds hợp lý
- clientRevision
```

Server xác minh activity tồn tại trong revision, chấm nếu cần rồi quyết định progress.

MVP có thể đơn giản hóa payload nhưng vẫn giữ nguyên nguyên tắc server quyết định completion.

### 16.4. Time spent

- Không tính toàn bộ thời gian tab mở.
- Client gửi heartbeat có giới hạn khi tab active.
- Dừng tính khi document hidden hoặc không có tương tác lâu.
- Server cap elapsed time trên mỗi batch để tránh số liệu bất thường.
- Time spent là analytics hỗ trợ, không phải dữ liệu tài chính/chứng nhận.

### 16.5. Streak

- Dựa trên timezone của user.
- Định nghĩa “ngày học hợp lệ” bằng activity/lesson/review có giá trị, không chỉ login.
- Lưu `lastQualifiedStudyDate` theo local date.
- Cập nhật idempotent trong transaction.
- Khi user đổi timezone, không hồi tố toàn bộ streak trong MVP.

### 16.6. Review scheduler

Interface đầu vào:

```text
currentReviewState
rating: again | hard | good | easy
answeredAt
schedulerVersion
```

Đầu ra:

```text
newState
dueAt
intervalDays
ease
correctStreak
lapseCount
```

Không để component tự tính `dueAt`.

## 17. Assessment engine

### 17.1. Interaction renderer và scoring strategy

Tách hai registry:

```text
questionRenderer[interactionType]
scoringStrategy[scoringStrategyCode]
```

Renderer chỉ hiển thị và thu response. Scoring strategy chạy ở server.

### 17.2. Answer normalization

Không có một hàm normalization chung cho mọi câu hỏi.

#### English

- Unicode normalization.
- Trim/collapse whitespace khi rubric cho phép.
- Case-insensitive tùy câu.
- Dấu câu và contraction theo rubric.

#### Japanese

- Unicode NFKC khi phù hợp.
- Full-width/half-width.
- Hiragana/katakana equivalence chỉ khi câu hỏi cho phép.
- Không tự coi kanji và kana tương đương cho mọi item.
- Romaji chỉ chấp nhận nếu rubric nói rõ.

#### Chinese

- Simplified/traditional equivalence theo cấu hình.
- Pinyin có dấu/số theo rubric.
- Khoảng trắng giữa âm tiết.
- Tone bắt buộc hoặc tùy chọn theo mục tiêu item.

Normalizer phải trả cả normalized value và reason để debug.

### 17.3. Objective scoring

P0 hỗ trợ:

- Exact single choice.
- Set equality cho multiple choice.
- Token sequence.
- Gap fill với accepted answers.
- Matching pairs.

Mỗi scorer có unit test cho:

- Đáp án đúng.
- Đáp án sai.
- Response rỗng.
- Response malformed.
- Unicode edge case.
- Retry/idempotency.

### 17.4. Subjective scoring

Writing và speaking ở MVP:

- Có thể lưu response/recording.
- Có self-check hoặc rubric tham khảo.
- Chưa cộng vào điểm chứng nhận tự động.

AI feedback nếu thêm sau này phải:

- Ghi rõ là phản hồi tham khảo.
- Lưu model/prompt/rubric version.
- Có cost/rate limit.
- Có safety/privacy review cho audio và bài viết.
- Không dùng làm claim chính thức nếu chưa đánh giá độ tin cậy.

### 17.5. Timer

- `startedAt` và `expiresAt` do server tạo.
- Client timer chỉ để hiển thị.
- Khi resume, client lấy lại server state.
- Submit sau `expiresAt` được server xử lý theo policy.
- Không giữ timer trong process memory của Next.js.

### 17.6. Autosave

- Local state cập nhật ngay.
- Debounce save, ví dụ sau vài giây hoặc khi chuyển câu/section.
- Mỗi section có `clientRevision`.
- Server trả `serverRevision` mới.
- Response cũ không được ghi đè response mới.
- Trước unload chỉ best-effort; không phụ thuộc duy nhất vào `beforeunload`.
- UI hiển thị `Đang lưu`, `Đã lưu`, `Mất kết nối`.

### 17.7. Submit transaction

Pseudo-flow:

```text
1. Read attempt metadata.
2. Assert owner and state == in_progress.
3. Compare server time with expiresAt.
4. Load immutable exam/question versions.
5. Normalize and score responses.
6. Write score + state submitted/graded.
7. Write result summary.
8. Commit only once.
```

Nếu scoring dài, bước 5 có thể tách thành idempotent grading job sau này. MVP objective test có thể chấm đồng bộ.

### 17.8. Score display

Luôn phân biệt:

- `rawScore`.
- `percentage`.
- `internalLevelEstimate`.
- `officialEquivalent`: mặc định không có.

Không mô phỏng scaled score của JLPT/IELTS/HSK nếu không có phương pháp hợp lệ và được phép.

## 18. Nội dung theo ngôn ngữ

### 18.1. Tiếng Anh

Khung học:

- CEFR can-do descriptors để xác định mục tiêu.
- General English A1 là pilot.
- IELTS/TOEIC là program riêng ở giai đoạn sau.

Dữ liệu hỗ trợ:

- Open English WordNet cho lexical relations/definitions phù hợp license.
- Tatoeba làm candidate example sentence, phải review.
- Nội dung bài học và câu hỏi do Lingora biên soạn.

### 18.2. Tiếng Nhật

Khung học:

- JF Standard/JF Can-do cho mục tiêu giao tiếp.
- JLPT official structure cho exam blueprint.
- Pilot tập trung A1/N5 foundation nhưng không tuyên bố hai thang đo tương đương tuyệt đối.

Dữ liệu hỗ trợ:

- JMdict cho từ vựng/reading.
- KANJIDIC2 cho thông tin kanji.
- Tatoeba làm candidate examples.

Yêu cầu UI:

- Furigana bật/tắt theo lesson/level.
- Font hiển thị kana/kanji rõ.
- Không dùng romaji mặc định quá lâu.
- Line breaking và selectable text hoạt động tốt.

### 18.3. Tiếng Trung

Khung học:

- Chinese Proficiency Grading Standards hiện hành.
- New HSK official syllabus/version cho exam-prep.
- Luôn lưu `frameworkVersion` vì syllabus có thể đổi.

Dữ liệu hỗ trợ:

- CC-CEDICT cho simplified/traditional/pinyin/meaning.
- Tatoeba làm candidate examples.

Yêu cầu UI:

- Bật/tắt pinyin.
- Phân biệt simplified/traditional.
- Tone mark hiển thị đúng Unicode.
- Không tự động chuyển thể chữ trong đáp án nếu rubric không cho phép.

### 18.4. UI locale và learning language

Ba khái niệm độc lập:

```text
uiLocale            = ngôn ngữ giao diện, MVP là vi
learningLanguage    = en | ja | zh
translationLanguage = ngôn ngữ giải nghĩa, MVP là vi
```

Không dùng `locale` duy nhất cho cả ba mục đích.

## 19. Nguồn học liệu và bản quyền

### 19.1. Nguồn khung/chứng chỉ

| Mục đích | Nguồn khuyến nghị | Cách dùng |
|---|---|---|
| English level | Council of Europe CEFR descriptors | Xây objective/can-do, không coi là bộ lesson |
| IELTS format | IELTS official samples | Tham khảo format; không copy vào sản phẩm thương mại nếu license không cho phép |
| Japanese learning | JF Standard, Irodori | Tham khảo curriculum và cách tổ chức; kiểm tra điều kiện từng asset |
| JLPT format | JLPT official test sections/sample | Xây blueprint, không sao chép câu hỏi/audio trái phép |
| Chinese level | GF0025-2021 và bản cập nhật chính thức | Gắn framework version |
| HSK format | Chinese Test official syllabus/sample | Xây blueprint theo version hiện hành |

### 19.2. Dataset mở

| Dataset | Vai trò | License/điều kiện cần theo dõi |
|---|---|---|
| Open English WordNet | Từ, nghĩa, lexical relation | CC BY 4.0 |
| JMdict/KANJIDIC2 | Từ và kanji tiếng Nhật | CC BY-SA 4.0, attribution và update requirement |
| CC-CEDICT | Từ Trung-Anh, pinyin, giản thể/phồn thể | CC BY-SA 4.0 |
| Tatoeba text | Candidate sentence | CC BY 2.0 FR hoặc CC0 tùy export |
| Tatoeba audio | Audio candidate | License theo từng contributor/file; thiếu license thì không dùng |

### 19.3. Quy tắc sử dụng

- “Tải miễn phí” không đồng nghĩa “được redistribute trong app”.
- Không scrape Cambridge, Oxford, Jisho, app đối thủ hoặc đề thi thương mại.
- Không copy nguyên bài đọc, audio hoặc hình từ tài liệu luyện thi.
- Share-alike áp dụng cho dữ liệu dẫn xuất theo license; giữ dữ liệu nhập tách rõ khỏi proprietary content.
- Có trang Sources/Attribution trong sản phẩm.
- Lưu version và ngày tải dataset.
- Có quy trình cập nhật dataset định kỳ.
- Nội dung do AI draft vẫn phải qua human review và kiểm tra nguồn/trùng lặp.

### 19.4. Content lifecycle

```text
source selected
  -> imported to staging
  -> normalized/deduplicated
  -> authored
  -> language review
  -> assessment review
  -> approved
  -> published revision
  -> monitored
  -> corrected by new revision hoặc retired
```

### 19.5. Content validation tự động

Validator phải phát hiện tối thiểu:

- Thiếu title/objective/instruction.
- Thiếu đáp án.
- Không có hoặc có nhiều đáp án đúng trái với interaction type.
- Option trùng nhau sau normalization.
- Correct answer không tồn tại trong options.
- Media reference hỏng.
- Listening activity thiếu audio/transcript.
- Source/license thiếu.
- Level/framework version thiếu.
- Duplicate question gần giống.
- Lesson vượt document size budget.
- Nội dung Japanese/Chinese thiếu reading/pinyin khi level yêu cầu.

## 20. Admin CMS

### 20.1. P0

- Course/unit/lesson list.
- Draft editor.
- Activity editor cho P0 types.
- Question editor cho objective items.
- Media upload.
- Preview learner view.
- Validate.
- Submit review.
- Approve/publish.
- Source selector.
- Audit log cơ bản.

### 20.2. P1

- Drag-and-drop reorder có optimistic UI.
- Bulk import/export.
- Diff revisions.
- Comment/review thread.
- Duplicate lesson/question.
- Bulk retag.
- Media usage finder.
- Content health dashboard.

### 20.3. Publish safety

- Publish button chỉ bật khi validation pass và role hợp lệ.
- Publish endpoint revalidate lần nữa; không tin trạng thái UI.
- Transaction cập nhật current revision pointer.
- Published revision không edit in place.
- Rollback chỉ đổi pointer về revision cũ và ghi audit.
- Nếu schema mới không đọc được revision cũ, migration phải chạy trước deploy UI.

## 21. Đánh giá base hiện tại

### 21.1. Phần đã có

- Next.js App Router và React.
- TypeScript strict.
- Firebase Authentication email/password và Google.
- Firebase ID token đổi thành HttpOnly session cookie.
- Firebase Admin SDK phía server.
- Firestore và Storage configuration.
- Role `user/admin`.
- Login, register, forgot password, logout.
- Profile update qua Route Handler.
- Protected dashboard và admin route.
- Firestore/Storage Rules cơ bản.
- Emulator configuration.
- Quality gates: typecheck, lint và build.

Không xây lại auth nếu chưa có bug hoặc yêu cầu mới. Roadmap bắt đầu từ domain, content và learner journey.

### 21.2. Phần chưa có

- Language/program/course domain.
- Content authoring và publish revision.
- Enrollment/progress/review.
- Lesson player.
- Question bank/exam engine.
- Composite index nghiệp vụ.
- Automated tests.
- Monitoring, rate limiting và production runbook.
- Content/license workflow.

`firestore.indexes.json` hiện chưa có composite index. Đây là trạng thái đúng với base hiện tại vì các query chủ yếu đọc user document theo ID. Không thêm index dự đoán trước; bổ sung theo query cards khi feature nghiệp vụ xuất hiện.

### 21.3. Cảnh báo về Rules hiện tại

Rules base hiện có wildcard cho admin đọc/ghi mọi document. Đây là tiện ích lúc dựng foundation, không phải trạng thái production mong muốn.

Trước beta phải:

- Thay wildcard bằng match cụ thể hoặc default deny.
- Không cho admin browser ghi trực tiếp role, score, audit log và question secret.
- Đưa admin mutation qua server service.
- Test allow/deny/adversarial case trong Emulator.

Một tài khoản admin bị chiếm hoặc lỗi UI không nên có khả năng sửa mọi dữ liệu trực tiếp từ browser.

Rules gọi `get()/exists()` để đọc role có thể phát sinh dependent read và chịu giới hạn rule access calls. Nếu admin action đều qua server, không cần mở quyền admin rộng cho Client SDK.

## 22. Performance và scaling

### 22.1. Capacity không đo bằng tổng số user

Cần xác định:

- DAU/MAU.
- Concurrent learners ở peak.
- Concurrent exam takers ở peak.
- Request/giây theo endpoint.
- Reads/writes trên mỗi learner session.
- Kích thước response và media bandwidth.
- Tỷ lệ cache hit.
- Tỷ lệ autosave.

Một triệu account nhưng chỉ vài trăm người online có thể nhẹ hơn mười nghìn người cùng submit exam.

### 22.2. Capacity envelope cho closed beta

Trước load test phải chốt giả định. Giá trị khởi đầu đề xuất:

```text
100 concurrent learners
50 concurrent exam takers
peak 50 exam submissions trong một cửa sổ ngắn
lesson open không quá 3 business document reads
không có unbounded query
không có global hot write document
```

Đây không phải giới hạn Firestore. Đây là mức launch đầu tiên cần chứng minh bằng staging. Load test ít nhất gấp hai capacity dự kiến trước khi mở cohort tương ứng.

### 22.3. Firestore ramp-up

- Phân tán document IDs và write keys.
- Với collection mới có traffic lớn, tăng tải dần theo hướng dẫn 500/50/5.
- Không bắn đột ngột toàn bộ traffic migration sang collection mới.
- Dùng deterministic cohort/hash khi rollout schema/read model mới.
- Theo dõi contention, deadline exceeded và latency trong quá trình ramp.

### 22.4. Region

- Chọn location production trước khi tạo dữ liệu lớn.
- Đặt Next.js server/functions gần Firestore.
- Đặt Storage phù hợp user base và compute.
- Không tạo DB ở một region rồi đặt server mặc định ở nửa kia thế giới.
- Quyết định regional hay multi-region dựa trên latency, availability và ngân sách.

### 22.5. Media delivery

- Audio/hình đi trực tiếp từ Storage/CDN, không proxy toàn bộ qua Next.js.
- Dùng immutable path có revision/hash.
- Đặt cache metadata thích hợp.
- Có ảnh/audio kích thước tối ưu cho web.
- Preload có chọn lọc, không tải audio cả unit ngay khi vào course.
- Có fallback và transcript khi media lỗi.

### 22.6. N+1

Không:

```text
read course
  -> read từng unit
      -> read từng lesson
          -> read từng activity
```

Ưu tiên manifest/bundle phù hợp đúng màn hình. Admin authoring có thể chuẩn hóa; learner read model được compile/denormalize.

## 23. Cost governance

### 23.1. Công thức theo journey

```text
monthlyReads =
  activeUsers
  * activeDaysPerUser
  * sessionsPerDay
  * averageReadsPerSession
  + admin/import/listener reads

monthlyWrites =
  progress writes
  + review writes
  + autosave writes
  + submit/result writes
  + admin publish/import writes
```

Không ước lượng chỉ bằng số account đã đăng ký.

### 23.2. Chi phí cần theo dõi

- Document reads/writes/deletes.
- Index-entry reads.
- Index storage.
- Network egress.
- Storage và media delivery.
- Backup/PITR/restore.
- Next.js function invocations và compute.
- Rule dependent reads.
- TTL deletes.
- Dịch vụ email/TTS/AI nếu thêm.

### 23.3. Bẫy chi phí

- Query trả 0 result vẫn có minimum charge theo chính sách hiện hành.
- Rules `get()/exists()` có thể tạo billed read, kể cả request bị deny.
- Listener có initial reads và có thể đọc lại khi reconnect.
- `offset` vẫn phải xử lý/tính phí item bị bỏ qua; dùng cursor.
- Aggregate query tính theo index entries được scan.
- Batch write giảm round trip/đảm bảo atomicity nhưng mỗi document write vẫn được tính.
- Index map/array lớn làm tăng storage và write amplification.
- Budget alert chỉ cảnh báo, không phải hard spending cap.

### 23.4. Metrics chi phí bắt buộc

- Reads/lesson-open.
- Writes/completed-lesson.
- Reads/review-session.
- Writes/review-answer.
- Reads+writes/exam-attempt.
- Storage egress/active learner.
- Cost/DAU và cost/MAU.

Nếu không đo được các số này, chưa thể kết luận kiến trúc rẻ hay đắt.

## 24. Observability

### 24.1. Structured log

Log server nên có:

```text
timestamp
level
eventName
requestId
uidHash hoặc uid khi thực sự cần và được bảo vệ
feature
route
durationMs
statusCode
errorCode
attemptId/contentId khi phù hợp
releaseVersion
```

Không log:

- Session cookie/token.
- Firebase private key.
- Password.
- Raw speaking/writing response không cần thiết.
- Correct answer payload đầy đủ trong client-observable logs.

### 24.2. Technical metrics

- Request count và error rate theo route.
- p50/p95/p99 latency.
- Function timeout/throttling.
- Firestore reads/writes.
- Query latency/index entries scanned.
- Transaction retry/contention.
- Storage errors/egress.
- Authentication failures bất thường.
- Publish failures.
- Autosave failures.

### 24.3. SLO beta ban đầu

Các ngưỡng phải được hiệu chỉnh sau staging:

- Error rate core journey dưới 1%.
- P95 API read thông thường dưới 1 giây khi warm.
- P95 mutation thông thường dưới 1,5 giây khi warm.
- Autosave được xác nhận trong khoảng 2 giây trên mạng bình thường.
- Không mất/nhân đôi result khi retry.
- Không có unauthorized read/write trong automated suite.
- Không còn Critical/High issue trước production.

### 24.4. Product analytics

Event P0:

```text
onboarding_started
onboarding_completed
program_enrolled
lesson_started
activity_answered
lesson_completed
lesson_mastered
review_session_started
review_session_completed
exam_started
exam_submitted
exam_expired
result_viewed
content_reported
```

Không gửi raw free-text answer vào analytics. Event schema có version và allowlist property.

Metrics sản phẩm:

- Activation: hoàn thành lesson đầu tiên.
- Enrollment-to-first-lesson.
- Lesson completion/mastery.
- D1/D7 retention.
- Review due completion.
- Exam start-to-submit.
- Câu hỏi quá dễ/quá khó.
- Content report rate.
- Cost/active learner.

## 25. Testing strategy

### 25.1. Unit tests

Ưu tiên pure domain logic:

- Zod schemas.
- Answer normalizers.
- Scoring functions.
- Lesson completion.
- Review scheduler.
- Permission helpers.
- Attempt/content state machines.
- Blueprint validator.
- Published payload sanitizer.

Không chạy theo coverage phần trăm toàn repo. Mọi nhánh trong decision table của scoring, normalizer và state transition phải được test.

### 25.2. Firestore Rules tests

Actors:

- Anonymous.
- Owner.
- Other user.
- Editor.
- Reviewer.
- Admin.

Cases:

- Read/create/update/delete.
- Cross-user access.
- Role escalation.
- Thay đổi immutable field.
- Draft/published access.
- Attempt/answer/result access.
- Field type/size sai.
- Query thiếu điều kiện/limit cần thiết.
- Adversarial payload.

Mỗi allow test nên có deny test tương ứng.

### 25.3. Integration tests

- Session authentication.
- Profile update.
- Seed idempotency.
- Publish revision.
- Enrollment.
- Progress retry.
- Create/resume attempt.
- Autosave với revision conflict.
- Submit/scoring/idempotency.
- Storage media validation.
- Account deletion traversal.

### 25.4. E2E tests

Core journeys:

1. Register/login -> enroll -> complete lesson.
2. Reload giữa lesson -> resume đúng activity.
3. Học xong -> review item xuất hiện -> hoàn thành review.
4. Start exam -> save -> reload -> submit -> result.
5. Timer hết hạn.
6. Editor draft -> reviewer approve -> admin publish.
7. Learner không thấy draft.
8. User A không đọc attempt của user B.

### 25.5. Content tests

- Toàn bộ published content parse được bằng current schema.
- Không có missing media/source.
- Không có duplicate option sau normalization.
- Question answer hợp lệ.
- Transcript/audio manifest đầy đủ.
- Document nằm trong size budget.
- Internal links tới lesson/lexeme tồn tại.
- Attribution page chứa mọi source đang dùng.

### 25.6. Load tests

Chạy trên staging, không chạy lần đầu trên production:

- Mở published lesson đồng thời.
- Autosave progress với debounce thực tế.
- Lấy review queue.
- Nhiều user bắt đầu exam.
- Burst submit exam.
- Admin publish revision trong khi learner đọc revision cũ.

Ramp ví dụ theo capacity đã duyệt:

```text
10 virtual users
-> 50
-> 100
-> 200 hoặc gấp đôi launch target
```

Đo:

- p50/p95/p99.
- Error/timeout.
- Reads/writes per journey.
- Transaction retry.
- Hotspot/contention.
- Cost ước tính.

## 26. Accessibility và UX quality

- Keyboard navigation hoàn chỉnh cho learner flow.
- Focus visible và focus management sau submit/chuyển câu.
- Input có label.
- Đúng/sai không chỉ thể hiện bằng màu.
- Status autosave dùng live region hợp lý, không spam screen reader.
- Audio có transcript và keyboard control.
- Hình có alt text hoặc được đánh dấu decorative.
- Japanese furigana dùng markup phù hợp.
- Hỗ trợ IME composition; không submit khi user đang compose Japanese/Chinese.
- Contrast đạt chuẩn.
- Respect reduced motion.
- Mobile touch target đủ lớn.
- Timer cảnh báo không gây hoảng loạn hoặc chặn accessibility.

## 27. Environment và deployment

### 27.1. Môi trường tách biệt

```text
Local: Firebase Emulator Suite
Development: Firebase project riêng
Staging: Firebase project riêng
Production: Firebase project riêng
```

Không dùng chung Auth, Firestore hoặc Storage giữa staging và production.

### 27.2. Biến môi trường

- `NEXT_PUBLIC_*` chỉ chứa Firebase web config công khai.
- Admin credentials chỉ ở server environment.
- Không commit service-account JSON hoặc `.env.local`.
- Validate env khi server khởi động/build ở mức phù hợp.
- Rotation secret có runbook.
- Preview deployment không được mặc định trỏ production data.

### 27.3. CI gates

Giữ quality gate hiện tại và mở rộng:

```text
typecheck
lint
unit tests
rules tests
integration tests quan trọng
build
```

E2E/load có thể chạy ở pipeline riêng tùy chi phí.

### 27.4. Thứ tự deploy an toàn

1. Backup/kiểm tra migration requirement.
2. Deploy additive schema/rules thay đổi tương thích ngược.
3. Deploy indexes mới và đợi trạng thái ready.
4. Chạy migration/seed idempotent nếu cần.
5. Deploy application hỗ trợ schema mới.
6. Smoke test.
7. Enable feature flag/cohort.
8. Theo dõi metrics.
9. Chỉ xóa schema/index cũ ở release sau.

Không deploy code query index mới trước khi index build xong.

### 27.5. Rollback

- App rollback về deployment trước.
- Content rollback bằng đổi current revision pointer.
- Migration phải có backward compatibility hoặc kế hoạch roll-forward rõ ràng.
- Không sửa/xóa published revision cũ trong cùng release.
- Ghi lại actor, reason và revision trong audit.

## 28. Backup, retention và deletion

### 28.1. Backup

- Bật backup/PITR phù hợp ngân sách trước public production.
- Có lịch export nếu cần.
- Backup chỉ có ý nghĩa khi đã diễn tập restore vào staging.
- Theo dõi backup failure.
- Tài liệu hóa RPO/RTO sau khi chọn plan/hạ tầng.

### 28.2. Retention

Phải chốt thời gian giữ:

- Attempts và answers.
- User recordings.
- Audit logs.
- Import files.
- Idempotency keys.
- Rate-limit buckets.
- Retired content versions.

Không giữ audio người dùng vô thời hạn nếu không có mục đích rõ ràng.

### 28.3. Account deletion

Firestore xóa parent document không tự xóa subcollection. Quy trình xóa account phải:

1. Xác minh user và yêu cầu xóa.
2. Đánh dấu deletion pending nếu cần grace period.
3. Xóa/ẩn dữ liệu cá nhân theo policy.
4. Recursive delete user subcollections.
5. Xóa Storage recordings/avatar.
6. Xóa Firebase Auth account.
7. Ghi audit không chứa dữ liệu cá nhân dư thừa.
8. Retry idempotent nếu job thất bại giữa chừng.

## 29. Migration và schema evolution

- Mọi long-lived document có `schemaVersion`.
- Reader có thể hỗ trợ version cũ trong một khoảng chuyển tiếp.
- Migration script có dry-run, limit, checkpoint và resume.
- Migration không chạy trong page render.
- Backfill dùng auto/rate-limited writes, tránh burst.
- Không sửa question version đã được attempt tham chiếu.
- Không xóa content revision còn được progress/attempt tham chiếu.
- Có report số document thành công/thất bại.
- Test migration bằng bản sao staging trước production.

## 30. Incident runbook tối thiểu

### 30.1. Nhóm incident

- Auth không hoạt động.
- Permission leak/unauthorized access.
- Correct answer bị leak.
- Firestore quota/cost spike.
- Latency hoặc contention.
- Publish sai nội dung.
- Media unavailable.
- Data corruption/loss.

### 30.2. Hành động chung

1. Xác định severity và phạm vi.
2. Dừng publish/feature flag nếu cần.
3. Bảo toàn log/evidence.
4. Rollback app/content.
5. Thu hồi session/credential nếu liên quan bảo mật.
6. Khôi phục dữ liệu nếu cần.
7. Thông báo phù hợp.
8. Viết postmortem và action items.

Không chỉnh trực tiếp production document hàng loạt qua Console mà không có snapshot, checklist và audit.

## 31. Roadmap triển khai

Ước lượng dành cho một developer full-time, không phải cam kết deadline. Nếu làm ngoài giờ, dùng milestone và acceptance criteria thay vì bám số tuần.

Critical path:

```text
Product contract
  -> Domain/schema
  -> Rules + query/index foundation
  -> Content draft/publish path
  -> English reference lesson
  -> Japanese/Chinese adapters
  -> Progress/review
  -> Exam engine
  -> Pilot content
  -> Security/performance hardening
  -> Closed beta
  -> Production
```

Content research và source registration bắt đầu ngay từ Phase 0 và chạy song song. Không bulk-import nội dung trước khi một lesson của cả ba ngôn ngữ chạy qua cùng engine.

### Phase 0 — Product contract

Thời lượng dự kiến: 3–5 ngày.

#### Mục tiêu

Chốt các khái niệm và phạm vi để schema không thay đổi liên tục khi code.

#### Công việc

- [ ] Chốt ba program pilot và framework version.
- [ ] Chốt chủ đề lesson reference và bốn lesson alpha.
- [ ] Chốt activity types P0.
- [ ] Chốt question types P0.
- [ ] Chốt định nghĩa `completed`, `mastered`, `passed`.
- [ ] Chốt daily goal và streak rule.
- [ ] Chốt role/permission matrix.
- [ ] Chốt dữ liệu client-readable và server-only.
- [ ] Viết query inventory ban đầu.
- [ ] Đặt read/write budget ban đầu.
- [ ] Chốt naming convention cho IDs, revisions và Storage paths.
- [ ] Lập source/license registry ban đầu.
- [ ] Viết danh sách non-goals.
- [ ] Chốt analytics event taxonomy P0.

#### Deliverables

- Product scope được duyệt.
- Curriculum outline của technical slice/alpha.
- Role matrix.
- Query cards P0.
- Source/license policy.
- Non-goals.

#### Acceptance criteria

- Mỗi màn hình MVP thuộc một core journey.
- Mỗi activity/question type có payload và scoring rule rõ.
- `level` luôn gắn program/framework version.
- Mỗi domain có source of truth.
- Không còn quyết định mơ hồ ảnh hưởng trực tiếp schema P0.

### Phase 1 — Domain, schema và Firebase foundation

Thời lượng dự kiến: 1–2 tuần.

#### Mục tiêu

Tạo nền dữ liệu, validation, Rules và repository đủ ổn định để các feature dùng chung.

#### Công việc

- [ ] Tạo types/Zod schemas cho language, program, course, lesson và activity.
- [ ] Tạo schemas cho lexeme/source/media.
- [ ] Tạo schemas cho enrollment/progress/review.
- [ ] Tạo schemas cho question/blueprint/attempt/result.
- [ ] Tách public DTO khỏi private persistence model.
- [ ] Thêm `schemaVersion` và version fields.
- [ ] Xây repository server-only theo feature.
- [ ] Tạo seed idempotent cho `en`, `ja`, `zh` và program pilot.
- [ ] Chuẩn hóa server timestamp.
- [ ] Khai báo collection constants.
- [ ] Thêm composite indexes từ query inventory.
- [ ] Thêm index exemptions cho field lớn đã xác nhận không query.
- [ ] Thay wildcard Rules bằng match/default-deny phù hợp.
- [ ] Thiết lập Rules test harness với Emulator.
- [ ] Tạo fixture hợp lệ và adversarial.
- [ ] Thiết kế migration script convention có dry-run/checkpoint.

#### Acceptance criteria

- Seed chạy lại không tạo duplicate.
- Schema chấp nhận fixture đúng và từ chối fixture sai.
- Anonymous/owner/other user/admin có quyền đúng.
- User không thể tự nâng role.
- Learner không đọc draft/question secret.
- Correct answer không nằm trong public DTO.
- Không có `firebase-admin` trong client bundle.
- Query P0 có filter/order/limit/index/read budget.
- Emulator reset và seed được lặp lại ổn định.
- `npm run check` pass.

### Phase 2 — Content authoring và publish minimum path

Thời lượng dự kiến: 1–2 tuần.

#### Mục tiêu

Có cách nhập nội dung được validate và publish thành immutable learner read model trước khi xây nhiều màn hình học.

#### Công việc

- [ ] Xây lesson/activity authoring schemas.
- [ ] Tạo source registry CRUD phía server.
- [ ] Tạo media upload flow có validation.
- [ ] Tạo content validator.
- [ ] Tạo preview route/view.
- [ ] Tạo publish compiler từ draft sang `PublishedLessonRevision`.
- [ ] Tính checksum và document size.
- [ ] Publish bằng transaction đổi current revision pointer.
- [ ] Ghi audit log.
- [ ] Tạo rollback pointer.
- [ ] Có thể dùng seed/import JSON có kiểm soát trước khi full CMS hoàn tất.

#### Acceptance criteria

- Có thể tạo một draft lesson mà không ghi thẳng published collection.
- Validator chặn missing answer/media/source.
- Publish tạo revision mới bất biến.
- Learner payload không có field private.
- Sửa draft không làm lesson đã publish thay đổi.
- Rollback về revision cũ không xóa lịch sử.
- Publish retry không tạo nhiều current revision khác nhau.

### Phase 3 — English reference learning slice

Thời lượng dự kiến: khoảng 2 tuần.

#### Mục tiêu

Hoàn thành learner journey đầu tiên với English làm reference implementation, không hard-code engine theo English.

#### Công việc

- [ ] Program/course catalog.
- [ ] Course overview.
- [ ] Enrollment.
- [ ] Lesson page và player shell.
- [ ] Activity renderer registry.
- [ ] Render `explanation` và `vocabulary_card`.
- [ ] Render/chấm `single_choice`, `gap_fill`, `reorder_tokens`.
- [ ] Listening player.
- [ ] Navigation previous/next.
- [ ] Local state và server autosave debounce.
- [ ] Resume activity gần nhất.
- [ ] Checkpoint và feedback.
- [ ] Completion/mastery calculation.
- [ ] Dashboard summary cơ bản.
- [ ] Loading/empty/error/retry states.
- [ ] Mobile/keyboard behavior.
- [ ] Analytics events P0.

#### Acceptance criteria

- User mới enroll và hoàn thành lesson không cần admin can thiệp.
- Reload không mất progress đã xác nhận lưu.
- Submit activity/completion hai lần không cộng hai lần.
- Published revision không đổi giữa session.
- Lesson player không phụ thuộc `languageId === en`.
- UI hiển thị `Đang lưu`, `Đã lưu`, `Lưu lỗi`.
- Core flow sử dụng được trên mobile và keyboard.
- Analytics không chứa raw free-text answer nhạy cảm.

### Phase 4 — Japanese/Chinese language adapters

Thời lượng dự kiến: 1–2 tuần.

#### Mục tiêu

Chứng minh cùng một engine xử lý đúng cả English, Japanese và Chinese.

#### Công việc

- [ ] Tạo language adapter/strategy boundary.
- [ ] Unicode normalization theo rubric.
- [ ] Japanese surface/kana/reading/furigana model.
- [ ] Full-width/half-width policy.
- [ ] Hiragana/katakana equivalence theo question config.
- [ ] Chinese simplified/traditional/pinyin model.
- [ ] Tone-mark/tone-number policy theo question config.
- [ ] Font fallback và line breaking.
- [ ] IME composition-safe form handling.
- [ ] Toggle furigana/pinyin theo lesson/user preference.
- [ ] Audio/transcript fallback.
- [ ] Publish một reference lesson cho mỗi ngôn ngữ.
- [ ] Test normalizer edge cases.

#### Acceptance criteria

- Ba lesson dùng cùng page tree và renderer registry.
- Không copy toàn bộ component cho từng ngôn ngữ.
- Furigana/pinyin bật tắt đúng.
- IME không bị submit khi đang compose.
- Policy đáp án nằm trong question revision, không hard-code toàn cục.
- Progress không bị trộn giữa program/language.
- Audio lỗi có fallback/transcript.

### Phase 5 — Progress, dashboard và review loop

Thời lượng dự kiến: 1–2 tuần.

#### Mục tiêu

Biến lesson đơn lẻ thành vòng lặp học tập có tiếp tục, mục tiêu ngày và ôn tập.

#### Công việc

- [ ] Enrollment status/current position.
- [ ] Course/unit/lesson progress summary.
- [ ] Continue-learning card.
- [ ] Daily stats.
- [ ] Streak theo timezone.
- [ ] Review item state machine.
- [ ] `ReviewScheduler` interface/version.
- [ ] Due review query có limit/index.
- [ ] Review session UI.
- [ ] Cập nhật schedule idempotent.
- [ ] Sinh review item từ lesson/checkpoint.
- [ ] Dashboard dùng aggregate thay vì scan.
- [ ] Unit tests cho scheduler/completion/streak.

#### Acceptance criteria

- Lesson completion tạo review item đúng và không trùng khi retry.
- Dashboard không scan toàn bộ progress/attempts.
- Due query có cursor/limit/index.
- User không đọc review queue của người khác.
- Scheduler có test cho `again/hard/good/easy`.
- Đổi timezone không nhân đôi daily progress.
- Save lỗi không hiển thị completion giả.
- Mỗi item lưu `schedulerVersion`.

### Phase 6 — Exam engine

Thời lượng dự kiến: 2–3 tuần.

#### Mục tiêu

Có hệ thống mini/mock exam dùng chung ba program, giữ đáp án phía server và an toàn khi retry/reload.

#### Công việc

- [ ] Question bank và immutable question versions.
- [ ] Exam blueprint schema/validator.
- [ ] Question pool hoặc pre-generated technical form.
- [ ] Attempt state machine.
- [ ] Server tạo attempt và question order.
- [ ] Public question sanitizer.
- [ ] Timer dựa trên server `expiresAt`.
- [ ] Section navigation.
- [ ] Autosave answers với revision.
- [ ] Resume attempt.
- [ ] Submit transaction/idempotency.
- [ ] Expiry policy.
- [ ] Server-side objective scoring.
- [ ] Result summary theo section/skill/topic.
- [ ] Review câu sai sau graded state.
- [ ] Mapping result về lesson/objective.
- [ ] Disclaimer điểm nội bộ.

#### Acceptance criteria

- Network payload trước submit không chứa correct answer/scoring secret.
- Reload/đóng tab rồi mở lại vẫn resume attempt hợp lệ.
- Chỉnh đồng hồ client không kéo dài thời gian.
- Hai submit đồng thời chỉ có một kết quả cuối.
- Answer không sửa được sau submit/expiry.
- Sửa question draft/latest không thay đổi attempt cũ.
- Mọi P0 scorer có decision-table tests.
- Tổng score khớp section scores và scoring version.
- User không đọc attempt/result của user khác.
- Một mini exam kỹ thuật chạy end-to-end cho cả ba program.

### Phase 7 — Full Admin CMS MVP

Thời lượng dự kiến: khoảng 2 tuần. Có thể làm một phần song song Phase 3–6.

#### Mục tiêu

Content team không cần source code hoặc Firestore Console để tạo, review và publish nội dung.

#### Công việc

- [ ] Thêm `editor/reviewer` nếu cần.
- [ ] Program/course/unit/lesson management UI.
- [ ] Activity editors P0.
- [ ] Question editor P0.
- [ ] Reorder hierarchy.
- [ ] Source/license selector.
- [ ] Media manager.
- [ ] Preview đúng learner renderer.
- [ ] Workflow draft/review/approve/reject/publish/retire.
- [ ] Rejection reason/comment tối thiểu.
- [ ] Optimistic conflict detection trên draft version.
- [ ] Revision diff cơ bản hoặc metadata change summary.
- [ ] Audit log viewer.
- [ ] Rollback UI có confirmation/reason.

#### Acceptance criteria

- Editor tạo course -> unit -> lesson -> activity từ UI.
- Reviewer preview và approve/reject được.
- Admin publish/rollback không dùng Console.
- Learner chỉ thấy published revision.
- Publish invalid content bị server chặn.
- Audit log có actor/action/time/entity/revision.
- Asset sai MIME/size bị từ chối.
- Editor không thể tự nâng role hoặc sửa score user.

### Phase 8 — Pilot content alpha

Thời lượng dự kiến: 3–6 tuần, chạy song song từ Phase 2.

#### Mục tiêu

Hoàn thiện một unit bốn lesson và một mini exam cho mỗi ngôn ngữ.

#### Công việc

- [ ] Curriculum map của 3 units pilot.
- [ ] Đăng ký nguồn/license.
- [ ] Biên soạn vocabulary/mẫu câu/giải thích.
- [ ] Tạo 12 lessons.
- [ ] Tạo khoảng 72–120 activities.
- [ ] Tạo audio và transcript.
- [ ] Tạo 3 unit checkpoints.
- [ ] Tạo khoảng 60 exam questions.
- [ ] Language review.
- [ ] Assessment review.
- [ ] Kiểm tra distractor/độ khó/đáp án.
- [ ] Kiểm tra attribution.
- [ ] Publish revision.
- [ ] Smoke test bằng learner account.

#### Content Definition of Done cho lesson

- [ ] Objective đo được.
- [ ] Prerequisite rõ.
- [ ] 8–12 từ/cụm trọng tâm hoặc scope được reviewer chấp thuận.
- [ ] Ít nhất một mẫu câu/điểm ngữ pháp nếu lesson cần.
- [ ] Ví dụ tự nhiên và phù hợp level.
- [ ] Audio có transcript.
- [ ] Activity đi từ nhận biết đến vận dụng có kiểm soát.
- [ ] Checkpoint không lặp nguyên toàn bộ câu luyện tập.
- [ ] Giải thích tiếng Việt đã review.
- [ ] Source/license metadata đầy đủ.
- [ ] Author và reviewer.
- [ ] Revision/date/checksum.

#### Content Definition of Done cho question

- [ ] Mapping objective/skill.
- [ ] Difficulty label.
- [ ] Answer và scoring rule.
- [ ] Explanation.
- [ ] Distractor rationale khi phù hợp.
- [ ] Source/provenance.
- [ ] Review status.
- [ ] Immutable revision.
- [ ] Không phụ thuộc dữ liệu ngoài có thể thay đổi.

#### Acceptance criteria

- Có 12 lessons, 3 checkpoints và 3 mini exams.
- Không còn placeholder/TODO trong published content.
- Mọi item có source/provenance.
- Mọi đáp án được reviewer xác minh.
- Audio và transcript khớp.
- Validator pass toàn bộ.
- Learner mới học được trọn ba unit pilot.

### Phase 9 — Security, performance và release hardening

Thời lượng dự kiến: khoảng 2 tuần.

#### Mục tiêu

Chứng minh hệ thống an toàn, quan sát được, chịu được capacity closed beta và có thể rollback.

#### Công việc

- [ ] Unit/integration/rules/E2E suites P0.
- [ ] Payload leak tests.
- [ ] Accessibility audit.
- [ ] Query Explain cho hot queries.
- [ ] Load test staging.
- [ ] Đo reads/writes từng journey.
- [ ] Kiểm tra hot documents/contention.
- [ ] Đặt budget alerts.
- [ ] Error tracking/structured logs.
- [ ] Backup/PITR theo plan.
- [ ] Restore drill vào staging.
- [ ] Rollback drill app/content.
- [ ] Rate limit/App Check decision.
- [ ] Privacy/retention/account deletion.
- [ ] Incident runbook.

#### Acceptance criteria

- CI pass typecheck, lint, tests và build.
- Core E2E pass ổn định.
- Rules adversarial suite pass.
- Không có unbounded query.
- Không có global hot document.
- Capacity load test đạt target.
- Reads/writes/cost per journey có báo cáo.
- Composite indexes staging ready.
- Retry/network/double-submit đã được test.
- Backup có restore drill thành công.
- Không còn Critical/High issue.

### Phase 10 — Closed beta và production v1

Thời lượng dự kiến: 1–2 tuần cho release work; beta có thể kéo dài theo dữ liệu thực tế.

#### Closed beta

- [ ] Mời cohort nhỏ.
- [ ] Theo dõi activation/completion/retention.
- [ ] Thu content feedback.
- [ ] Theo dõi latency/errors/cost.
- [ ] Sửa lỗi/data issue.
- [ ] Không mở thêm scope lớn trong vòng ổn định.

#### Production release checklist

- [ ] Dev/staging/prod hoàn toàn tách biệt.
- [ ] Rules production khớp source control.
- [ ] Indexes đều ready.
- [ ] Storage Rules đã test.
- [ ] Không có secret trong Git/client bundle.
- [ ] Staff/admin security được tăng cường phù hợp.
- [ ] Không có debug endpoint.
- [ ] Không có draft lộ cho learner.
- [ ] Content/license sign-off.
- [ ] Attribution page hoạt động.
- [ ] Backup gần nhất thành công.
- [ ] Rollback đã diễn tập.
- [ ] Alerts có người nhận.
- [ ] Release version xuất hiện trong logs/errors.
- [ ] Smoke test production bằng learner/staff account.
- [ ] Chi phí dự kiến trong ngân sách.
- [ ] Rollout theo cohort/feature flag.

#### Acceptance criteria

- Beta users hoàn thành được learning/review/exam journeys.
- Không có security incident hoặc data-loss bug chưa xử lý.
- Error/latency nằm trong ngưỡng đã chốt.
- Cost per active learner đo được.
- App và content rollback độc lập.
- Có owner cho incident, content issue và billing alert.

### Ước lượng tổng

| Nhóm | Ước lượng full-time |
|---|---:|
| Product/domain foundation | 1–2 tuần |
| Content publish/Admin CMS | 3–4 tuần |
| Learning + language adapters | 3–4 tuần |
| Progress/review | 1–2 tuần |
| Exam engine | 2–3 tuần |
| Testing/hardening/release | 3–4 tuần |
| Pilot content | 3–6 tuần, có thể chạy song song |

Tổng kỹ thuật hợp lý: khoảng 12–17 tuần. Nếu một người vừa code, biên soạn và tự review cả ba ngôn ngữ, tổng lịch có thể thành 16–22 tuần hoặc lâu hơn. Không hy sinh review nội dung để chạy theo mốc thời gian.

## 32. Release milestones

### M0 — Auth foundation

Trạng thái hiện tại gần hoàn thành:

- Auth flows.
- Session.
- User/admin route.
- Profile.
- Base Rules/config.

### M1 — Technical slice

- Một reference lesson mỗi ngôn ngữ.
- Một learner engine.
- Save/resume.
- Một mini exam kỹ thuật.
- Minimal publish path.

### M2 — Internal alpha

- Một unit bốn lesson mỗi ngôn ngữ.
- Review queue.
- Một mini exam mỗi program.
- Content đã review nội bộ.

### M3 — Closed beta

- Admin workflow.
- Automated security tests.
- Monitoring và feedback.
- Capacity/cost measured.
- Backup/rollback proven.

### M4 — Production v1

- Stable pilot programs.
- No critical issue.
- Operational ownership.
- Controlled rollout.
- Expansion based on real metrics.

## 33. Prioritized backlog

### P0 — Bắt buộc để closed beta

- Auth/session hiện tại ổn định.
- Language/program/course domain.
- Published lesson revision.
- Source/license registry.
- Activity renderer P0.
- Enrollment/progress.
- Review queue cơ bản.
- Question bank/mini exam.
- Server-side scoring.
- Admin draft/validate/review/publish.
- Rules/indexes/tests.
- Monitoring/cost metrics.
- Backup/rollback.
- 12 pilot lessons và 3 mini exams.

### P1 — Sau khi core ổn định

- Placement mini test.
- Multiple choice/matching/dictation đầy đủ.
- Full mock exam form.
- Advanced review scheduling.
- Content diff/comment workflow.
- Bulk import/export.
- Search service nếu admin content đủ lớn.
- Learner content report workflow.
- Better product analytics.
- Downloadable result/report.

### P2 — Chỉ làm khi có tín hiệu người dùng

- AI conversation.
- AI writing/speaking feedback.
- Subscription/payment.
- Social/leaderboard.
- Teacher/classroom mode.
- Native mobile/offline-first.
- Adaptive testing nâng cao.
- Organization/school tenancy.
- Data warehouse/BI pipeline lớn.

## 34. Permission matrix chi tiết

Mọi mutation nhạy cảm đi qua server; bảng mô tả quyền nghiệp vụ, không phải trực tiếp Firestore Client permission.

| Resource/action | User | Editor | Reviewer | Admin |
|---|---:|---:|---:|---:|
| Đọc published content | Own access | Có | Có | Có |
| Đọc draft | Không | Draft được giao/phạm vi cho phép | Có | Có |
| Tạo/sửa draft | Không | Có | Có giới hạn | Có |
| Submit review | Không | Có | Có | Có |
| Approve language review | Không | Không mặc định | Có | Có |
| Publish/rollback | Không | Không | Không mặc định | Có |
| Quản lý source | Không | Có | Có | Có |
| Quản lý role | Không | Không | Không | Có |
| Đọc learner progress | Chỉ bản thân | Không mặc định | Không mặc định | Theo use case audited |
| Ghi progress/review | Qua learner service | Không | Không | Không sửa tay |
| Start/submit attempt | Bản thân | Bản thân nếu cũng là learner | Bản thân | Bản thân |
| Sửa score/result | Không | Không | Không | Không sửa tay; chỉ audited correction flow |
| Đọc audit log | Không | Giới hạn nếu cần | Giới hạn nếu cần | Có |

Nguyên tắc separation of duties: nếu đội content có nhiều người, người viết một item không nên là người duy nhất approve item đó.

## 35. Query card template

Mỗi query mới phải có một record trong issue/PR hoặc tài liệu feature:

```text
Query ID:
Journey:
Consumer page/API:
Owner feature:
Collection/path:
Actor/permission:
Filters:
Order by:
Limit:
Cursor:
Expected cardinality:
Reads tối đa/request:
Requests/session:
Composite index:
Index exemptions liên quan:
Fallback/error state:
Cache policy:
Staging fixture size:
Query Explain result:
```

Query chưa có limit/read budget/index decision không được coi là hoàn tất review.

## 36. API contract conventions

### 36.1. Success response

Response chỉ trả DTO cần thiết. Không trả raw Firestore snapshot/document metadata.

```text
{
  "data": { ... },
  "meta": {
    "requestId": "...",
    "nextCursor": "..."
  }
}
```

`meta` chỉ có field thực sự cần; không bắt buộc bọc mọi RSC read theo format REST này.

### 36.2. Error response

```text
{
  "error": {
    "code": "ATTEMPT_ALREADY_SUBMITTED",
    "message": "Bài thi đã được nộp.",
    "requestId": "...",
    "fieldErrors": { ... }
  }
}
```

Error code P0:

```text
UNAUTHENTICATED
FORBIDDEN
INVALID_INPUT
NOT_FOUND
CONFLICT
RATE_LIMITED
CONTENT_REVISION_CHANGED
ATTEMPT_EXPIRED
ATTEMPT_ALREADY_SUBMITTED
SAVE_REVISION_CONFLICT
INTERNAL_ERROR
```

Không dùng message text làm logic phía client.

### 36.3. Retry policy

- GET/read có thể retry với backoff khi lỗi tạm thời.
- Autosave retry khi idempotent và revision còn hợp lệ.
- Submit chỉ retry với cùng idempotency key.
- Validation/permission error không retry tự động.
- UI luôn cho user biết trạng thái save/submit.

## 37. Feature Definition of Done

Một feature chỉ được coi là hoàn thành khi:

- [ ] Có user story và acceptance criteria.
- [ ] Có domain/schema/validation.
- [ ] Có permission/ownership decision.
- [ ] Có query card và index decision.
- [ ] Không có unbounded query.
- [ ] Có loading/empty/error/retry states.
- [ ] Có idempotency cho mutation có thể retry.
- [ ] Có unit/integration/rules/E2E test tương xứng rủi ro.
- [ ] Không log dữ liệu nhạy cảm.
- [ ] Có accessibility/mobile behavior.
- [ ] Có analytics event cần thiết và privacy review.
- [ ] Có observability/error code.
- [ ] Có migration/rollback nếu đổi long-lived data.
- [ ] Chạy được bằng Emulator/staging.
- [ ] `npm run check` pass.
- [ ] Không còn TODO ảnh hưởng acceptance criteria.

## 38. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Dấu hiệu sớm | Biện pháp |
|---|---|---|
| Scope content quá lớn | Code xong nhưng chưa có lesson publish | Chỉ một unit/ngôn ngữ, template và content DoD |
| Schema thay đổi liên tục | Migration lặp lại mỗi sprint | Technical slice trước bulk import, immutable revisions |
| Leak đáp án | Correct answer xuất hiện trong network/cache | Private collection, public sanitizer, automated leak test |
| Firestore read cost cao | Reads/session vượt budget | Snapshot, manifest, aggregate, cache, Query Explain |
| Hot document | Transaction retry/latency ở counter | Per-user docs, shard hoặc async aggregate |
| Composite index bùng nổ | Admin filter tạo nhiều missing index | Query contract, poolKey, precomputed form, search service sau |
| Rules quá rộng | Client admin ghi mọi collection | Default deny, server-owned mutations, emulator tests |
| Admin SDK thiếu authorize | Route chỉ kiểm tra đăng nhập | Permission checks ở service, adversarial integration tests |
| Autosave tốn write | Write tăng theo keystroke/timer | Dirty-state debounce và section chunks |
| Content không rõ license | Item thiếu source/attribution | Source registry và publish gate |
| AI tạo nội dung sai | Câu mơ hồ/không tự nhiên | Human language + assessment review |
| Vendor lock-in | Service trả raw Firestore types | Feature repository, pure domain logic, export strategy |
| Ba ngôn ngữ làm code phân nhánh | Component copy theo language | Adapter/strategy và schema union |
| Mất dữ liệu khi xóa user | Parent bị xóa nhưng subcollection còn | Recursive deletion job + tests |
| Production không rollback được | Publish sửa đè revision | Immutable revision + pointer rollback |
| Cost bất ngờ | Chỉ có budget alert, không có journey metrics | Billing dashboard/export + cost per active learner |

## 39. Anti-patterns bị cấm

- Nhét `correctAnswer` vào document client đọc được.
- Tin rằng TypeScript type hoặc UI có thể ẩn field bí mật.
- Giữ wildcard admin read/write ở production.
- Nghĩ Admin SDK bị Firestore Rules kiểm soát.
- Client tự ghi `role`, `score`, `streak`, `completedAt` hoặc `publishedAt`.
- Một global document nhận mọi counter update.
- Mảng progress/answers tăng vô hạn trong một document.
- Sửa đè question/content revision đã được dùng.
- Xóa parent và cho rằng subcollections tự xóa.
- N+1 read từng activity.
- Autosave mỗi keystroke hoặc countdown tick.
- Realtime listener cho mọi màn hình.
- Offset pagination cho collection lớn.
- Random question bằng cách tải toàn collection.
- Tạo mọi tổ hợp composite index.
- Index large text/map/array không cần query.
- Dùng Firestore làm full-text search hoặc analytics warehouse.
- Lưu audio/image base64 trong Firestore.
- Dùng sequential IDs cho write-heavy collection.
- Dùng chung Firebase project staging/production.
- Chỉ test allow case của Rules.
- Dùng App Check thay authorization.
- Submit/publish không có idempotency.
- Sửa production hàng loạt qua Console không audit/backup.
- Thêm PostgreSQL/MongoDB/Redis chỉ để “trông giống backend”.

## 40. Khi nào xem xét PostgreSQL

Không migration chỉ vì user count tăng. Firestore có thể scale lớn nếu access pattern đúng. Xem xét PostgreSQL hoặc analytics store khi có bằng chứng:

- Báo cáo thường xuyên cần join nhiều domain.
- Admin filter/search tạo quá nhiều composite index.
- Transaction nghiệp vụ cần constraint/quan hệ mà Firestore biểu diễn khó và dễ sai.
- Cost/read amplification đã tối ưu nhưng vẫn vượt ngân sách.
- Cần cohort/BI query phức tạp trên dữ liệu vận hành.
- Cần full-text/faceted search vượt khả năng Firestore.
- Migration/export/backup requirement đòi mô hình quan hệ rõ hơn.
- Team có đủ năng lực vận hành connection pool, migrations và SQL performance.

Trước khi migration:

1. Ghi query/report cụ thể Firestore đang không đáp ứng tốt.
2. Đo latency và chi phí hiện tại.
3. Làm spike với dữ liệu thật ở staging.
4. Xác định source of truth từng domain.
5. Thiết kế backfill, dual-read/dual-write có thời hạn và rollback.
6. Không để hai database cùng là source of truth lâu dài.

Repository boundary theo feature giúp migration, nhưng không xây abstraction tổng quát quá sớm chỉ để chuẩn bị cho tình huống giả định.

## 41. Decision log cần duy trì

Mỗi quyết định lớn nên có ADR ngắn:

```text
ADR ID và tiêu đề
Ngày
Trạng thái: proposed | accepted | superseded
Bối cảnh
Quyết định
Lựa chọn đã cân nhắc
Trade-offs
Hệ quả
Điều kiện xem xét lại
```

ADR P0 nên có:

- Firebase-first và server-owned business writes.
- Published lesson snapshot strategy.
- User-scoped attempts.
- Private question/scoring data.
- Content revision/publish model.
- Review scheduler v1.
- Exam scoring/disclaimer.
- Region và environment strategy.

## 42. Kế hoạch các pull request đầu tiên

Không bắt buộc đúng số PR, nhưng nên giữ mỗi PR có một mục đích review được.

### PR 1 — Domain contracts

- Language/program/course/activity schemas.
- Version/timestamp/ID conventions.
- Public/private DTO boundary.
- Fixtures và schema unit tests.
- Chưa có learner UI lớn.

### PR 2 — Firestore security foundation

- Collection constants.
- Default-deny Rules theo collection.
- Rules test harness.
- Owner/admin/adversarial tests.
- Xóa dependency vào wildcard admin client access.

### PR 3 — Seed và published content read model

- Idempotent seed cho languages/programs.
- Draft fixture.
- Publish compiler.
- Published lesson revision.
- Source/checksum/size validation.

### PR 4 — Catalog và enrollment

- Program/course pages.
- Enrollment API/service.
- Query cards/indexes.
- Loading/empty/error states.

### PR 5 — Lesson player reference

- Activity registry.
- English reference lesson.
- Local state/autosave/resume.
- Completion/checkpoint tests.

### PR 6 — Language adapters

- Japanese/Chinese models và normalization.
- Furigana/pinyin.
- IME handling.
- Một reference lesson mỗi ngôn ngữ.

### PR 7 — Review loop

- Review items/scheduler.
- Due query/index.
- Review UI.
- Dashboard aggregates.

### PR 8+ — Exam engine theo vertical slices

- Question/version/blueprint.
- Attempt/timer/autosave.
- Submit/scoring/result.
- Security/E2E/load hardening.

## 43. Câu hỏi phải chốt trước khi bắt đầu Phase 1

Các câu hỏi này không chặn việc đọc tài liệu, nhưng chặn schema/content production nếu chưa quyết định:

1. English pilot chỉ là General English CEFR A1 hay phải luyện một chứng chỉ cụ thể?
2. Japanese pilot ưu tiên giao tiếp JF A1 hay JLPT N5 exam-prep?
3. Phiên bản New HSK nào là source of truth tại ngày bắt đầu biên soạn?
4. Learner được coi là `completed` khi submit checkpoint hay phải đạt ngưỡng?
5. `mastered` threshold của pilot là bao nhiêu và có khác theo lesson không?
6. Review v1 dùng bốn rating hay chỉ đúng/sai?
7. Published lesson đọc trực tiếp Firestore hay luôn qua cached server layer?
8. Region production dự kiến và phần lớn user ở đâu?
9. Ai chịu trách nhiệm language review cho từng ngôn ngữ?
10. Audio dùng người thu, TTS hay kết hợp; quyền thương mại ra sao?
11. Có lưu speaking recordings không; retention bao lâu?
12. Closed beta dự kiến bao nhiêu concurrent users?
13. Ngân sách Firestore/Storage/hosting mỗi tháng là bao nhiêu?
14. Role editor/reviewer cần ngay alpha hay admin duy nhất đủ dùng?

Quyết định nên được ghi ADR, không chỉ nằm trong chat.

## 44. Go/no-go checklist trước public production

Chỉ release khi mọi câu liên quan bảo mật, dữ liệu, bản quyền và rollback đều có câu trả lời “Có”.

### Product

- [ ] User mới học trọn một unit không cần hỗ trợ thủ công.
- [ ] Reload giữa lesson/exam resume đúng.
- [ ] Review queue tạo và cập nhật đúng.
- [ ] Result giải thích được và không claim chứng chỉ thật.
- [ ] Ba ngôn ngữ dùng chung engine.

### Content

- [ ] Không có placeholder/TODO trong published content.
- [ ] Mọi item có source/provenance.
- [ ] License/attribution đã sign-off.
- [ ] Language và assessment review hoàn tất.
- [ ] Audio/transcript khớp.
- [ ] Có content report/escalation flow.

### Security

- [ ] Correct answer chỉ ở server trước submit.
- [ ] Learner không đọc draft/private user data.
- [ ] Client không tự ghi role/score/publish fields.
- [ ] Admin SDK routes tự authorize.
- [ ] Rules automated/adversarial tests pass.
- [ ] Secrets không nằm trong repo/client bundle/log.
- [ ] Rate limit/abuse decision đã triển khai.

### Data

- [ ] Published/question versions bất biến.
- [ ] Double-submit/retry idempotent.
- [ ] Account deletion xử lý subcollections/storage.
- [ ] Migration/backfill có dry-run và checkpoint.
- [ ] Backup và restore drill thành công.
- [ ] App/content rollback độc lập.

### Performance/cost

- [ ] Mọi production query có limit.
- [ ] Query/index catalog đầy đủ.
- [ ] Indexes ready.
- [ ] Không có N+1/hot global document.
- [ ] Load test đạt launch capacity.
- [ ] Reads/writes/cost per journey đo được.
- [ ] Billing alerts và owner hoạt động.

### Operations

- [ ] Monitoring/log/error tracking hoạt động.
- [ ] Incident và rollback runbook có owner.
- [ ] Smoke test production pass.
- [ ] Release theo cohort/feature flag.
- [ ] Không còn Critical/High issue mở.

Nếu một mục Security, Data hoặc Content licensing chưa đạt, release dừng dù UI đã hoàn thiện.

## 45. Tài liệu chính thức cần tham chiếu

Các liên kết có thể thay đổi; kiểm tra lại phiên bản và điều khoản tại thời điểm triển khai/import.

### Firebase/Firestore

- [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- [Understand reads and writes at scale](https://firebase.google.com/docs/firestore/understand-reads-writes-scale)
- [Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas)
- [Firestore pricing behavior](https://firebase.google.com/docs/firestore/pricing)
- [Firestore index overview](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Manage Firestore indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firestore Query Explain](https://firebase.google.com/docs/firestore/query-explain)
- [Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Secure queries with Rules](https://firebase.google.com/docs/firestore/security/rules-query)
- [Transaction contention](https://firebase.google.com/docs/firestore/transaction-data-contention)

### Language frameworks và exam formats

- [Council of Europe CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)
- [IELTS official sample questions](https://ielts.org/take-a-test/preparation-resources/sample-test-questions)
- [IELTS copyright statement](https://ielts.org/legal/ielts-copyright-and-trade-mark-statement)
- [JF Standard for Japanese-Language Education](https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do)
- [Irodori](https://www.irodori.jpf.go.jp/en/)
- [Irodori resource restrictions](https://www.irodori.jpf.go.jp/en/resources.html)
- [JLPT sample questions](https://www.jlpt.jp/e/samples/forlearners.html)
- [JLPT site/copyright policy](https://www.jlpt.jp/e/policy.html)
- [Chinese proficiency standard GF0025-2021](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/t20210329_523304.html)
- [Official New HSK overview](https://www.chinesetest.cn/hsk)

### Open lexical/corpus data

- [Open English WordNet downloads/license](https://en-word.net/downloads)
- [EDRDG JMdict/KANJIDIC licence](https://www.edrdg.org/edrdg/licence.html)
- [CC-CEDICT download/license](https://www.mdbg.net/chinese/dictionary?page=cedict)
- [Tatoeba downloads and licenses](https://tatoeba.org/en/downloads)

## 46. Tài liệu sống và cách cập nhật

- Mọi thay đổi phạm vi lớn cập nhật document này hoặc ADR trước implementation.
- Khi code khác tài liệu, PR phải cập nhật một trong hai; không để mâu thuẫn âm thầm.
- Budget giả định phải được thay bằng số staging/production thực tế.
- Query catalog/index plan phải cập nhật cùng feature.
- Framework/license phải được kiểm tra lại theo lịch hoặc trước mỗi content release lớn.
- Roadmap được review sau mỗi milestone, không coi estimate là hợp đồng cố định.
- Những phần đã triển khai nên được đánh dấu bằng issue/milestone thực tế, không tự động coi checklist trong tài liệu là trạng thái hệ thống.

## 47. Kết luận

Hướng Firebase-first phù hợp với Lingora giai đoạn đầu nếu tuân thủ bốn điều:

1. Dữ liệu được thiết kế theo query và read/write budget.
2. Published content được compile, version hóa và cache; không đọc N+1.
3. Progress, attempts, scoring và publish là server-owned, idempotent và được test.
4. Nội dung có source/license/reviewer trước khi tới learner.

Ưu tiên tiếp theo không phải thêm database hoặc microservice. Ưu tiên là hoàn thành một technical slice nhỏ chạy đúng cả Anh–Nhật–Trung, đo số reads/writes thật, rồi mới mở rộng thành pilot content và closed beta.
