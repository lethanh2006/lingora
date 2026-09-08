import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  Check,
  GalleryHorizontalEnd,
  Sprout,
  TextCursorInput,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { StudyIllustration } from "@/features/vocabulary/components/study-illustration";

const benefits = [
  {
    number: "01",
    icon: GalleryHorizontalEnd,
    title: "Lật mở điều mới",
    name: "Lật thẻ",
    text: "Nhìn từ, thử đoán nghĩa rồi lật thẻ. Mỗi lần tự nhớ là một lần hiểu thêm.",
    color: "bg-[#e8f2e4] text-primary",
  },
  {
    number: "02",
    icon: Blocks,
    title: "Kết nối để nhớ lâu",
    name: "Ghép từ",
    text: "Ghép từ với nghĩa qua những lượt chơi ngắn. Để kiến thức dần thành phản xạ.",
    color: "bg-[#eeebf9] text-violet-700",
  },
  {
    number: "03",
    icon: TextCursorInput,
    title: "Tự mình viết lại",
    name: "Điền từ",
    text: "Thử sức trí nhớ bằng cách gõ từ đã học. Nhận ra điều đã nhớ và điều cần ôn thêm.",
    color: "bg-[#fcf0d8] text-amber-700",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex h-22 max-w-6xl items-center justify-between gap-2 px-5 sm:px-8">
        <Logo />
        <nav
          aria-label="Điều hướng trang chủ"
          className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"
        >
          <a href="#cach-hoc" className="hover:text-primary">
            Cách học
          </a>
          <Link href="/about" className="hover:text-primary">
            Về Lingora
          </Link>
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Đăng nhập
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Bắt đầu học
            <ArrowUpRight className="hidden size-3.5 sm:block" />
          </Link>
        </div>
      </header>
      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-4 px-5 pb-16 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-8 lg:pb-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary">
              <Sprout className="size-3.5" />
              Một chút mỗi ngày. Một thế giới mới.
            </span>
            <h1 className="mt-7 text-[46px] font-bold leading-[1.12] tracking-[-0.055em] sm:text-6xl lg:text-[68px]">
              Từ mới hôm nay.
              <br />
              <span className="text-primary">Tự tin ngày mai.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">
              Học ngôn ngữ bắt đầu từ những điều nhỏ. Chọn chủ đề bạn thích,
              chơi với từ mới và tìm thấy niềm vui trong từng bước tiến bộ.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Bắt đầu miễn phí
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#cach-hoc"
                className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-semibold"
              >
                Khám phá cách học
                <ArrowUpRight className="size-4" />
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Học theo nhịp của bạn
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" />
                Tiến độ được lưu lại
              </span>
            </div>
          </div>
          <div className="relative mt-5 rounded-[40px] bg-[#eaf0d8] px-2 pt-7 lg:mt-0">
            <div className="dot-pattern absolute right-5 top-6 h-20 w-24 text-primary/20" />
            <StudyIllustration />
            <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-2xl border bg-card px-5 py-3 shadow-[0_6px_20px_#243b3208]">
              <span className="text-2xl">🇬🇧 🇯🇵 🇨🇳</span>
              <span className="text-[11px] leading-5 text-muted-foreground">
                Ba ngôn ngữ.
                <br />
                <strong className="font-semibold text-foreground">
                  Vô vàn điều để khám phá.
                </strong>
              </span>
            </div>
          </div>
        </section>
        <section id="cach-hoc" className="scroll-mt-8 border-y bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-primary">Nhẹ nhàng mà hiệu quả</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
                  Một bộ từ. Ba cách để ghi nhớ.
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                Đổi cách luyện để mỗi buổi học luôn có một chút mới mẻ.
              </p>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {benefits.map(
                ({ number, icon: Icon, title, name, text, color }) => (
                  <article
                    key={name}
                    className="rounded-2xl border bg-background p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`grid size-12 place-items-center rounded-xl ${color}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground/70">
                        {number}
                      </span>
                    </div>
                    <p className="eyebrow mt-6 text-muted-foreground">{name}</p>
                    <h3 className="mt-2 text-lg font-bold">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {text}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#eaf0d8] p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Hành trình của bạn, bắt đầu từ một từ.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Dành vài phút cho bản thân hôm nay. Lingora sẽ đồng hành cùng
                bạn.
              </p>
            </div>
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Cùng bắt đầu
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-5 py-7 sm:px-8">
        <Logo />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lingora · Học từng chút, nhớ thật lâu.
        </p>
        <Link
          href="/about"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Về Lingora
        </Link>
      </footer>
    </div>
  );
}
