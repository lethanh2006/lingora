import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = [
  { icon: BookOpen, title: "Học có cấu trúc", text: "Nội dung theo khóa học, bài học và tiến độ cá nhân." },
  { icon: Sparkles, title: "Tập trung thực hành", text: "Một nền tảng gọn gàng cho tiếng Nhật, tiếng Anh và hơn thế nữa." },
  { icon: ShieldCheck, title: "Nền móng an toàn", text: "Xác thực Firebase, session phía server và phân quyền rõ ràng." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>Đăng nhập</Link>
          <Link href="/register" className={cn(buttonVariants())}>Bắt đầu học</Link>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="absolute -right-32 top-8 -z-10 size-96 rounded-full bg-emerald-200/40 blur-3xl" />
          <p className="mb-5 inline-flex rounded-full border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Learn without limits
          </p>
          <h1 className="max-w-4xl text-5xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-7xl">
            Mỗi ngôn ngữ mở ra một thế giới mới.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Lingora giúp bạn xây thói quen học bền vững với lộ trình rõ ràng, nội dung thực tế và trải nghiệm tập trung.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
              Tạo tài khoản miễn phí <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/about" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Tìm hiểu thêm</Link>
          </div>
        </section>

        <section className="border-y bg-white/70">
          <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border bg-background p-6">
                <Icon className="mb-5 size-6 text-primary" aria-hidden="true" />
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} Lingora
      </footer>
    </div>
  );
}
