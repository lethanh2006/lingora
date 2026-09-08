import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { StudyIllustration } from "@/features/vocabulary/components/study-illustration";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col bg-card px-5 py-7 sm:px-10 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-14">
          {children}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          Về trang chủ
        </Link>
      </section>
      <aside className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#eaf0d8] px-10 py-12 lg:flex">
        <span className="eyebrow inline-flex items-center gap-2 text-primary">
          <Sprout className="size-4" />
          Học từng chút, nhớ thật lâu
        </span>
        <StudyIllustration />
        <div className="max-w-sm text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.04em]">
            Một khởi đầu nhỏ.
            <br />
            Vô vàn điều mới mẻ.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Vài từ mỗi ngày, một chút tự tin mỗi lần. Cùng Lingora xây thói quen
            học ngôn ngữ của riêng bạn.
          </p>
        </div>
        <div className="mt-7 flex items-center gap-3 rounded-full bg-white/55 px-5 py-2.5">
          <span>🇬🇧</span>
          <span>🇯🇵</span>
          <span>🇨🇳</span>
          <span className="ml-1 text-[11px] font-semibold text-primary">
            Ba ngôn ngữ, một hành trình
          </span>
        </div>
      </aside>
    </main>
  );
}
