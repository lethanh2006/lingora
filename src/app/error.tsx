"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-destructive">Có lỗi xảy ra</p>
        <h1 className="mt-3 text-3xl font-bold">Lingora chưa thể tải nội dung này.</h1>
        <p className="mt-3 text-muted-foreground">Vui lòng thử lại. Nếu lỗi tiếp diễn, hãy quay lại sau.</p>
        <Button className="mt-6" onClick={retry}>Thử lại</Button>
      </div>
    </main>
  );
}
