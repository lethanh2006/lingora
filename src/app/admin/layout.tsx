import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AdminNavigationLinks } from "@/components/layout/admin-navigation";
import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh min-w-0 bg-muted/40">
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
            <AdminNavigationLinks variant="desktop" />
          </nav>
          <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
            Chỉ cần tạo chủ đề, thêm từ và bật hiển thị. Người học sẽ thấy thay đổi ngay khi tải lại trang.
          </div>
        </aside>

        <div className="w-full min-w-0 max-w-full">
          <nav
            className="sticky top-16 z-20 grid w-full min-w-0 max-w-full grid-cols-3 gap-1 border-b bg-background/95 px-2 py-2 shadow-sm backdrop-blur md:hidden"
            aria-label="Điều hướng quản trị di động"
          >
            <AdminNavigationLinks variant="mobile" />
          </nav>
          <main className="w-full min-w-0 max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
