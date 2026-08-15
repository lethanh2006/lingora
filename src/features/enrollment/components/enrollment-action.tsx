"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EnrollmentAction({
  programId,
  isEnrolled,
}: {
  programId: string;
  isEnrolled: boolean;
}) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(isEnrolled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      if (!response.ok) throw new Error("Chưa thể ghi danh. Vui lòng thử lại.");

      setEnrolled(true);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa thể ghi danh. Vui lòng thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={enroll} disabled={enrolled || isLoading}>
        {enrolled && <CheckCircle2 className="size-4" aria-hidden="true" />}
        {enrolled ? "Đã ghi danh" : isLoading ? "Đang ghi danh..." : "Ghi danh chương trình"}
      </Button>
      {enrolled && (
        <p className="text-sm text-emerald-700" role="status">
          Chương trình đã được thêm vào lộ trình học của bạn.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
