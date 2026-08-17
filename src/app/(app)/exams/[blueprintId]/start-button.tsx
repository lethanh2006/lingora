"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartExamButtonProps {
  blueprintId: string;
}

export function StartExamButton({ blueprintId }: StartExamButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blueprintId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to start exam");
      }

      const { attempt } = await res.json();
      router.push(`/attempts/${attempt.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi chuẩn bị bài thi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      <Button
        className="w-full h-12 text-base font-bold shadow-md hover:scale-[1.01] transition-transform"
        onClick={handleStart}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="size-5 mr-2 animate-spin" />
            Đang chuẩn bị đề thi...
          </>
        ) : (
          <>
            <Play className="size-5 mr-2" />
            Bắt đầu làm bài thi
          </>
        )}
      </Button>
    </div>
  );
}
