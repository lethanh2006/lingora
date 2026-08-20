"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MockDataSeederButton() {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    if (!confirm("Hệ thống sẽ thiết lập dữ liệu tiến trình học và từ vựng ôn tập mẫu cho tài khoản của bạn để chạy thử nghiệm. Bạn có muốn tiếp tục?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dev/seed-mock", {
        method: "POST",
      });
      if (res.ok) {
        alert("Khởi tạo dữ liệu thử nghiệm thành công!");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Lỗi: ${data.error || "Không thể khởi tạo dữ liệu mẫu."}`);
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi kết nối khi khởi tạo dữ liệu mẫu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSeed}
      disabled={loading}
      variant="outline"
      className="border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 font-semibold gap-2 shadow-sm rounded-xl shrink-0"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Sparkles className="size-4" />
      )}
      <span>Kích hoạt Dữ liệu Demo</span>
    </Button>
  );
}
