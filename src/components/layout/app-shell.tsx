import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Leaf, Search, Sprout } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { AppNavigation } from "@/components/layout/app-navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { AppActivityTracker } from "@/features/notifications/components/app-activity-tracker";
import { getCurrentUser } from "@/lib/auth/session";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  return (
    <div className="min-h-dvh min-w-0">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-xl bg-primary px-4 py-3 text-white focus:not-sr-only"
      >
        Đến nội dung chính
      </a>
      {user && (
        <AppActivityTracker
          userId={user.uid}
          initiallyEnabled={user.studyRemindersEnabled}
        />
      )}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r bg-card px-5 py-8 lg:flex">
        <div className="px-3">
          <Logo href="/dashboard" />
        </div>
        <p className="eyebrow mb-4 mt-12 px-4 text-muted-foreground">
          Không gian học tập
        </p>
        <AppNavigation isAdmin={isAdmin} />
        <div className="mt-auto pt-10">
          <div className="relative overflow-hidden rounded-2xl bg-[#edf3e6] p-5">
            <Sprout
              className="mb-3 size-7 text-primary"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm font-bold">Một chút mỗi ngày.</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Từng từ mới hôm nay, thêm tự tin cho ngày mai.
            </p>
            <Link
              href="/review"
              className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary"
            >
              Dành 5 phút học <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-5 border-t pt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-10">
            <div className="lg:hidden">
              <Logo href="/dashboard" />
            </div>
            <p className="hidden items-center gap-2.5 text-sm text-muted-foreground lg:flex">
              <Leaf className="size-4 text-primary" /> Một hành trình nhỏ, một
              thế giới rộng hơn.
            </p>
            <div className="flex items-center gap-3 sm:gap-5">
              <Link
                href="/learn"
                aria-label="Tìm chủ đề từ vựng"
                className="grid size-10 place-items-center rounded-full border bg-card text-muted-foreground transition hover:text-primary"
              >
                <Search className="size-[18px]" />
              </Link>
              <span className="hidden h-7 w-px bg-border sm:block" />
              <Link
                href="/settings"
                className="flex min-w-0 items-center gap-3"
                aria-label="Mở hồ sơ và cài đặt"
              >
                <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
                  {user?.displayName}
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border-4 border-white bg-[#e4ecd6] text-sm font-bold text-primary">
                  {user?.displayName
                    ?.trim()
                    .slice(0, 1)
                    .toLocaleUpperCase("vi") || "L"}
                </span>
              </Link>
            </div>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="page-enter mx-auto w-full min-w-0 max-w-[1320px] px-5 py-7 outline-none sm:px-8 sm:py-9 lg:px-10"
        >
          {children}
        </main>
        <footer className="mx-auto mt-6 max-w-[1320px] px-5 pb-28 text-[10px] leading-5 text-muted-foreground sm:px-8 lg:px-10 lg:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-5">
            <span>Lingora · Học từng chút, nhớ thật lâu.</span>
            <Link href="/about" className="hover:text-primary">
              Về Lingora
            </Link>
          </div>
          <p className="mt-2">
            Audio tiếng Nhật:{" "}
            <a
              className="underline"
              href="https://github.com/kanjialive/kanji-data-media"
              target="_blank"
              rel="noreferrer"
            >
              Kanji Alive (CC BY 4.0)
            </a>{" "}
            và{" "}
            <a
              className="underline"
              href="https://github.com/tofugu/japanese-vocabulary-pronunciation-audio"
              target="_blank"
              rel="noreferrer"
            >
              Tofugu (CC BY-SA 4.0)
            </a>
            , qua{" "}
            <a
              className="underline"
              href="https://jotoba.de/about"
              target="_blank"
              rel="noreferrer"
            >
              Jotoba
            </a>
            .
          </p>
          <div className="mt-3 lg:hidden">
            <LogoutButton />
          </div>
        </footer>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <AppNavigation isAdmin={isAdmin} mobile />
      </div>
    </div>
  );
}
