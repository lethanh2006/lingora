import Link from "next/link";
import { Languages } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Languages className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg">Lingora</span>
    </Link>
  );
}
