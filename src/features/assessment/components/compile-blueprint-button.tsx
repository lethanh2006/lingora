"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface CompileBlueprintButtonProps {
  blueprintId: string;
}

export function CompileBlueprintButton({ blueprintId }: CompileBlueprintButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCompile = async () => {
    const confirmCompile = confirm("Bạn có chắc chắn muốn biên dịch đề thi từ blueprint này không?");
    if (!confirmCompile) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exams/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blueprintId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể biên dịch đề thi.");
      }
      alert(`Biên dịch thành công! Phiên bản mới: v${data.blueprintVersion}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      setError(msg);
      alert(`Lỗi: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 items-start">
      <Button
        onClick={handleCompile}
        disabled={loading}
        size="sm"
        variant="outline"
        className="text-xs h-7 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
      >
        <Play className="size-3 fill-current" />
        {loading ? "Đang biên dịch..." : "Biên dịch Đề thi"}
      </Button>
      {error && <span className="text-[10px] text-destructive font-medium">{error}</span>}
    </div>
  );
}
