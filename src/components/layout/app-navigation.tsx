"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  LayoutDashboard,
  LibraryBig,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AppNavigation({
  isAdmin = false,
  mobile = false,
}: {
  isAdmin?: boolean;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/learn", label: "Khám phá", icon: LibraryBig },
    { href: "/review", label: "Luyện tập", icon: Gamepad2 },
    { href: "/settings", label: "Cài đặt", icon: Settings },
    ...(isAdmin
      ? [{ href: "/admin", label: "Quản trị", icon: ShieldCheck }]
      : []),
  ];
  return (
    <nav
      aria-label={mobile ? "Điều hướng trên điện thoại" : "Điều hướng chính"}
      className={cn(
        mobile ? "grid grid-flow-col auto-cols-fr gap-1" : "space-y-1.5",
      )}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center rounded-xl font-semibold transition-colors",
              mobile
                ? "min-h-14 flex-col justify-center gap-1 text-[10px]"
                : "h-12 gap-3 px-4 text-sm",
              active
                ? "bg-primary/9 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className="size-[19px]"
              strokeWidth={active ? 2.3 : 1.7}
              aria-hidden="true"
            />
            {label}
            {active && !mobile && (
              <span className="ml-auto size-1.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
