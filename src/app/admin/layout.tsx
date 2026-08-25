import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, LayoutDashboard, LibraryBig, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";

const adminNavigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/topics", label: "Chủ đề & từ vựng", icon: LibraryBig },
  { href: "/learn", label: "Xem như người học", icon: Eye },
];

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-muted/40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 min-w-0 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/admin" />
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary sm:inline-flex">
              <ShieldCheck className="size-3.5" />
              Quản trị từ vựng
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="size-3.5" />
              Về trang học
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-border bg-background/70 px-3 py-6 md:block">
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Nội dung ứng dụng
          </p>
          <nav className="space-y-1" aria-label="Điều hướng quản trị">
            {adminNavigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
            Chỉ cần tạo chủ đề, thêm từ và bật hiển thị. Người học sẽ thấy thay đổi ngay khi tải lại trang.
          </div>
        </aside>

        <div className="w-full min-w-0 max-w-full">
          <nav className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b bg-background px-4 py-3 md:hidden" aria-label="Điều hướng quản trị di động">
            {adminNavigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
          <main className="w-full min-w-0 max-w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
