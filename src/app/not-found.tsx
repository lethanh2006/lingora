import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Không tìm thấy trang</h1>
        <p className="mt-3 text-muted-foreground">Đường dẫn này không tồn tại hoặc đã được di chuyển.</p>
        <Link href="/" className={buttonVariants({ className: "mt-6" })}>Về trang chủ</Link>
      </div>
    </main>
  );
}
