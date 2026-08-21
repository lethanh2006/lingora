import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <Logo />
      <div className="py-24"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Về Lingora</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Một ứng dụng nhỏ, tập trung vào việc nhớ từ.</h1><p className="mt-6 text-lg leading-8 text-muted-foreground">Lingora tổ chức từ vựng thành các chủ đề dễ học. Mỗi danh sách từ tự động trở thành ba kiểu luyện tập: lật thẻ, ghép từ và điền từ. Không có khóa học nhiều tầng hay quy trình xuất bản phức tạp.</p><Link href="/register" className={buttonVariants({ size: "lg", className: "mt-8" })}>Bắt đầu học</Link></div>
    </main>
  );
}
