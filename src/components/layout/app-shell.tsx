import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { LogoutButton } from "@/features/auth/components/logout-button";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Học", icon: BookOpen },
  { href: "/settings", label: "Cài đặt", icon: Settings },
  { href: "/admin", label: "Quản trị", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/dashboard" />
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Điều hướng ứng dụng">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition hover:bg-background hover:text-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
