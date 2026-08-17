import type { ReactNode } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  BookOpen,
  HelpCircle,
  FileQuestion,
  Layers,
  Link2,
  ClipboardList,
  LayoutDashboard,
  ArrowLeft,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";

const adminNav = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/questions", label: "Ngân hàng câu hỏi", icon: HelpCircle },
  { href: "/admin/exams", label: "Đề thi (Blueprints)", icon: FileQuestion },
  { href: "/admin/sources", label: "Source Registry", icon: Link2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
];

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
              <ShieldCheck className="size-3" />
              Admin CMS
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Về Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-background/60 min-h-[calc(100vh-4rem)] px-3 py-6 hidden md:block">
          <nav className="space-y-1" aria-label="Admin navigation">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-3">
              Quản trị nội dung
            </p>
            {adminNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-1 overflow-x-auto px-4 py-3 border-b bg-background w-full">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          ))}
        </div>

        <main className="flex-1 px-4 sm:px-6 py-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
