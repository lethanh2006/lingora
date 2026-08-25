import type { ReactNode } from "react";
import Link from "next/link";
import { Gamepad2, LayoutDashboard, LibraryBig, Settings, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { AppActivityTracker } from "@/features/notifications/components/app-activity-tracker";
import { getCurrentUser } from "@/lib/auth/session";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const navigation = [
    { href: "/dashboard", label: "Trang chủ", icon: LayoutDashboard },
    { href: "/learn", label: "Chủ đề", icon: LibraryBig },
    { href: "/review", label: "Luyện tập", icon: Gamepad2 },
    { href: "/settings", label: "Cài đặt", icon: Settings },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Quản trị", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-muted/40">
      {user && (
        <AppActivityTracker
          userId={user.uid}
          initiallyEnabled={user.studyRemindersEnabled}
        />
      )}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 min-w-0 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-7 px-4 py-6 sm:px-6 md:grid-cols-[190px_minmax(0,1fr)] md:py-8">
        <nav className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain md:flex-col" aria-label="Điều hướng ứng dụng">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-background hover:text-foreground">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <main className="w-full min-w-0 max-w-full">{children}</main>
      </div>
      <footer className="mx-auto max-w-6xl px-4 pb-6 text-center text-[10px] leading-4 text-muted-foreground sm:px-6">
        Audio tiếng Nhật: <a className="underline" href="https://github.com/kanjialive/kanji-data-media" target="_blank" rel="noreferrer">Kanji Alive (CC BY 4.0)</a> và <a className="underline" href="https://github.com/tofugu/japanese-vocabulary-pronunciation-audio" target="_blank" rel="noreferrer">Tofugu (CC BY-SA 4.0)</a>, phân phối qua <a className="underline" href="https://jotoba.de/about" target="_blank" rel="noreferrer">Jotoba</a>.
      </footer>
    </div>
  );
}
