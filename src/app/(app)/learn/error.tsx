"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function LearnError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-destructive/30 bg-card px-6 py-12 text-center">
      <p className="text-sm font-semibold text-destructive">Không thể tải danh mục</p>
      <h1 className="mt-2 text-2xl font-bold">Dữ liệu học tạm thời chưa khả dụng.</h1>
      <p className="mt-3 text-sm text-muted-foreground">Hãy thử lại. Tiến độ hiện tại của bạn không bị ảnh hưởng.</p>
      <Button className="mt-6" onClick={reset}>Thử lại</Button>
    </div>
  );
}
