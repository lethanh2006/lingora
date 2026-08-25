"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, LayoutDashboard, LibraryBig } from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Tổng quan", mobileLabel: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/topics", label: "Chủ đề & từ vựng", mobileLabel: "Chủ đề", icon: LibraryBig },
  { href: "/learn", label: "Xem như người học", mobileLabel: "Trang học", icon: Eye },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigationLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  return navigation.map(({ href, label, mobileLabel, icon: Icon }) => {
    const isActive = isActivePath(pathname, href);

    return (
      <Link
        key={href}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          variant === "mobile"
            ? "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold leading-tight transition-colors"
            : "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className={variant === "mobile" ? "w-full truncate text-center" : undefined}>
          {variant === "mobile" ? mobileLabel : label}
        </span>
      </Link>
    );
  });
}
