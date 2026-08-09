import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <Logo />
      <div className="py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Về Lingora</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Học ngôn ngữ theo cách bền vững.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Lingora được xây dựng như một nền tảng học đa ngôn ngữ. Nội dung, trình độ và tiến độ là dữ liệu, vì vậy hệ thống có thể phát triển mà không nhân đôi kiến trúc.
        </p>
        <Link href="/register" className={buttonVariants({ size: "lg", className: "mt-8" })}>Bắt đầu học</Link>
      </div>
    </main>
  );
}
