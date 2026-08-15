import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function LearnNotFound() {
  return (
    <div className="rounded-2xl border bg-card px-6 py-14 text-center">
      <p className="text-sm font-semibold text-primary">Không tìm thấy nội dung</p>
      <h1 className="mt-2 text-2xl font-bold">Chương trình hoặc khóa học không tồn tại.</h1>
      <p className="mt-3 text-sm text-muted-foreground">Nội dung có thể chưa được xuất bản hoặc đã ngừng cung cấp.</p>
      <Link href="/learn" className={buttonVariants({ className: "mt-6" })}>Về danh mục học</Link>
    </div>
  );
}
