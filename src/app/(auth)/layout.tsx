import Link from "next/link";

import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">{children}</div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Về trang chủ</Link>
      </section>
      <aside className="relative hidden overflow-hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/70 blur-3xl" />
        <blockquote className="relative max-w-xl text-3xl font-semibold leading-snug tracking-tight">
          “Một ngôn ngữ mới không chỉ là những từ mới — đó là một cách nhìn thế giới mới.”
        </blockquote>
        <p className="relative mt-5 text-sm text-background/60">Lingora · Learn without limits</p>
      </aside>
    </main>
  );
}
