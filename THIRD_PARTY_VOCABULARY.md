# Nguồn dữ liệu từ vựng phân cấp

Tài liệu này ghi nguồn, phiên bản, giấy phép và các thay đổi áp dụng cho dữ liệu trong `src/features/vocabulary/seed/graded-*-vocabulary.ts`.

Bộ seed của Lingora là tập cốt lõi đã biên tập, không phải bản sao đầy đủ của các nguồn: 20 từ cho mỗi cấp, gồm 120 từ tiếng Anh, 100 từ tiếng Nhật và 140 từ tiếng Trung. Lingora chọn mục từ, tạo ID, chuẩn hóa cách đọc và tự biên soạn nghĩa tiếng Việt ngắn. Không sao chép câu ví dụ hoặc phần giải nghĩa dài từ nguồn. Quản trị viên vẫn cần duyệt nội dung trước khi mở rộng hoặc dùng cho chương trình chính thức.

## Tiếng Anh

### CEFR A1–B2

- Nguồn: [CEFR-J Wordlist v1.6](https://www.cefr-j.org/download.html), do Yukio Tono/Tono Laboratory, Tokyo University of Foreign Studies biên soạn.
- Tệp nguồn: [CEFRJ_wordlist_ver1.6.zip](https://www.cefr-j.org/data/CEFRJ_wordlist_ver1.6.zip).
- Điều khoản: CEFR-J cho phép dùng miễn phí cho nghiên cứu, giáo dục và thương mại với điều kiện ghi nguồn đúng; bản quyền thuộc Tono Laboratory/TUFS. Đây là điều khoản riêng của nguồn, không phải giấy phép SPDX.
- Thay đổi của Lingora: chọn 20 headword cho từng cấp A1–B2, bỏ thông tin từ loại khỏi mô hình hiện tại và tự biên soạn nghĩa tiếng Việt.

### CEFR C1–C2

- Nguồn: [Octanove Vocabulary Profile C1/C2 v1.0](https://github.com/openlanguageprofiles/olp-en-cefrj/blob/master/octanove-vocabulary-profile-c1c2-1.0.csv), do Octanove Labs tạo và Open Language Profiles phân phối.
- Giấy phép: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
- Thay đổi của Lingora: chọn 20 headword cho từng cấp C1–C2, tạo ID và tự biên soạn nghĩa tiếng Việt. Phần dữ liệu dẫn xuất này tiếp tục được cung cấp theo CC BY-SA 4.0.

### IPA Anh-Mỹ

- Nguồn: [ipa-dict](https://github.com/open-dict-data/ipa-dict/tree/43c3570eb3553bdd19fccd2bd0091534889af023), bộ `en_US`, dựa trên `cmudict-ipa`/CMU Pronouncing Dictionary và có dấu trọng âm từ `syllabify`.
- Giấy phép: [MIT](https://github.com/open-dict-data/ipa-dict/blob/43c3570eb3553bdd19fccd2bd0091534889af023/LICENSE); dữ liệu bên thứ ba giữ giấy phép gốc như phần Credits của dự án nêu rõ.
- Thay đổi của Lingora: chọn một cách đọc General American phù hợp với nghĩa thông dụng và bọc IPA trong `/…/`.

CEFR không quy định một danh sách từ vựng chính thức duy nhất. CEFR-J và Octanove là các vocabulary profile được ánh xạ vào các cấp CEFR; Lingora không dùng hoặc phân phối lại Cambridge English Vocabulary Profile hay Oxford 3000/5000.

## Tiếng Nhật

- Nguồn phân cấp: [stephenmk/yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab/tree/b062d4e38c4bdd0950ae1d4ec55f04b176182e03), commit `b062d4e38c4bdd0950ae1d4ec55f04b176182e03`.
- Nguồn gốc: JLPT Resources của Jonathan Waller, phát hành theo [Creative Commons Attribution](https://www.tanos.co.uk/jlpt/sharing/); dự án `yomitan-jlpt-vocab` đã đối chiếu và chuẩn hóa mục từ bằng JMdict.
- Giấy phép dữ liệu đã chuẩn hóa: [Creative Commons Attribution-ShareAlike 4.0 International](https://github.com/stephenmk/yomitan-jlpt-vocab/blob/b062d4e38c4bdd0950ae1d4ec55f04b176182e03/LICENSE.txt). JMdict thuộc Electronic Dictionary Research and Development Group và có [điều khoản sử dụng riêng](https://www.edrdg.org/edrdg/licence.html).
- Thay đổi của Lingora: chọn 20 cặp `term + kana` cho từng cấp N5–N1, kiểm tra 100/100 cặp với CSV nguồn, tạo ID và tự biên soạn nghĩa tiếng Việt. Phần dữ liệu dẫn xuất này tiếp tục được cung cấp theo CC BY-SA 4.0.

[FAQ chính thức của JLPT](https://www.jlpt.jp/e/faq/) xác nhận tổ chức không còn công bố danh sách từ vựng, kanji và ngữ pháp chính thức từ lần sửa kỳ thi năm 2010. Vì vậy các cấp N5–N1 trong Lingora chỉ là phân loại tham chiếu cộng đồng, không phải danh sách chính thức hoặc nội dung được JLPT bảo chứng.

## Tiếng Trung

- Chuẩn hiện hành: [新版HSK考试大纲（词汇、汉字、语法）](https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf), ChineseTest phát hành tháng 11/2025 và áp dụng từ tháng 07/2026.
- Nguồn văn bản để đối chiếu: [krmanik/HSK-3.0 — New HSK (2025)](https://github.com/krmanik/HSK-3.0/tree/182692ce5a11bc30bdc771835d2f0f27491c25de/New%20HSK%20%282025%29), commit `182692ce5a11bc30bdc771835d2f0f27491c25de`.
- Giấy phép danh sách từ của nguồn cộng đồng: [Creative Commons Attribution-ShareAlike 4.0 International](https://github.com/krmanik/HSK-3.0/blob/182692ce5a11bc30bdc771835d2f0f27491c25de/License.md).
- Thay đổi của Lingora: chọn 20 từ cho HSK 1–6 và nhóm HSK 7–9, kiểm tra 140/140 cặp từ + pinyin với nguồn, tạo ID và tự biên soạn nghĩa tiếng Việt. Phần dữ liệu dẫn xuất này tiếp tục được cung cấp theo CC BY-SA 4.0.

Lingora dùng đề cương 2025 đang có hiệu lực, không gắn nhãn bộ seed theo danh sách chuẩn năng lực năm 2021 đã bị thay thế cho kỳ thi hiện hành.

## Âm thanh

Các file seed phân cấp không đóng gói hoặc sao chép file audio bên thứ ba. Khi `audioUrl` trống hoặc phát lỗi, ứng dụng dùng Web Speech API với giọng `en-US`, `ja-JP` hoặc `zh-CN`. Trong biểu mẫu gợi ý tiếng Nhật, Lingora chỉ lưu URL HTTPS do Jotoba trả về từ nguồn được cho phép; attribution audio Kanji Alive/Tofugu được hiển thị ngay trong giao diện.

Ngày kiểm tra nguồn gần nhất: 24/08/2026.
