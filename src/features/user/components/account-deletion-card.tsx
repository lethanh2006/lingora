"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AccountDeletionCard() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") {
      setError("Vui lòng nhập chính xác chữ 'DELETE' để xác nhận.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Không thể xóa tài khoản. Vui lòng thử lại sau.");
      }

      // Successful deletion redirects to welcome/login page
      router.push("/login?message=deleted");
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi ngoài ý muốn.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-red-200/60 shadow-md">
      <CardHeader className="bg-red-50/20 border-b border-red-100/40">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="size-5" />
          <CardTitle className="text-red-700">Khu vực nguy hiểm</CardTitle>
        </div>
        <CardDescription>
          Hành động này không thể hoàn tác. Mọi tiến trình học tập, lịch sử thi và dữ liệu của bạn sẽ bị xóa vĩnh viễn khỏi Lingora.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {!showConfirm ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Xóa tài khoản của bạn</p>
              <p className="text-xs text-muted-foreground">
                Tất cả dữ liệu hồ sơ, bài làm, từ vựng ôn tập của bạn sẽ bị xóa sạch.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              className="font-semibold bg-red-600 hover:bg-red-700 shrink-0"
            >
              <Trash2 className="size-4 mr-2" />
              Xóa tài khoản
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex gap-3 text-sm text-red-800">
              <ShieldAlert className="size-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Bạn có chắc chắn muốn xóa tài khoản?</p>
                <p className="text-xs text-red-700/90 mt-0.5">
                  Để xác nhận, vui lòng nhập chữ <strong className="font-bold text-red-900 font-mono">DELETE</strong> vào ô bên dưới.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Nhập DELETE để xác nhận"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isLoading}
                className="font-mono text-sm max-w-sm border-red-200 focus-visible:ring-red-500"
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-600 font-medium">{error}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || isLoading}
                onClick={handleDeleteAccount}
                className="font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Xác nhận xóa tài khoản"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={isLoading}
                className="font-medium"
              >
                Hủy bỏ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
