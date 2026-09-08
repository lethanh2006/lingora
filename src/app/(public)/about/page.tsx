import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Heart, Sprout } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Về Lingora" };

export default function AboutPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-4xl px-5 sm:px-8">
      <header className="flex h-22 items-center justify-between">
        <Logo />
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Trang chủ
        </Link>
      </header>
      <main className="pb-20 pt-14 sm:pt-20">
        <p className="eyebrow text-primary">Câu chuyện của Lingora</p>
        <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
          Học ngôn ngữ, bắt đầu từ niềm vui nhỏ mỗi ngày.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground">
          Không phải buổi học nào cũng cần dài. Đôi khi, chỉ một vài từ mới, một
          lượt lật thẻ và cảm giác “mình đã nhớ rồi” cũng đủ để bạn muốn quay
          lại ngày mai.
        </p>
        <div className="my-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Học điều bạn thích",
              text: "Từ chủ đề đời thường đến các cấp độ tiếng Anh, Nhật và Trung. Bạn chọn điểm bắt đầu.",
            },
            {
              icon: Sprout,
              title: "Tiến bộ theo nhịp riêng",
              text: "Lật thẻ, ghép từ, điền từ. Linh hoạt đổi cách học và ôn lại những từ cần thêm thời gian.",
            },
            {
              icon: Heart,
              title: "Nhìn thấy nỗ lực của mình",
              text: "Mỗi phiên luyện được ghi lại để bạn theo dõi vốn từ, thời gian và nhịp học qua từng tuần.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border bg-card p-6">
              <Icon className="size-6 text-primary" strokeWidth={1.5} />
              <h2 className="mt-5 text-base font-bold">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {text}
              </p>
            </article>
          ))}
        </div>
        <section className="rounded-3xl bg-[#eaf0d8] p-8">
          <h2 className="text-2xl font-bold tracking-tight">
            Một từ mới cũng là một bước tiến.
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Cùng xây một thói quen nhỏ mà bạn mong chờ mỗi ngày.
          </p>
          <Link
            href="/register"
            className={`${buttonVariants({ size: "lg" })} mt-6`}
          >
            Bắt đầu cùng Lingora
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
