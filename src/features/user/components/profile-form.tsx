"use client";

import { useState, type FormEvent } from "react";
import { ZodError } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema } from "@/features/user/schemas/profile.schema";

export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const formData = new FormData(event.currentTarget);
      const parsed = profileSchema.parse({ displayName: formData.get("displayName") });
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) throw new Error("Không thể cập nhật hồ sơ.");
      setMessage("Đã cập nhật hồ sơ.");
    } catch (reason) {
      if (reason instanceof ZodError) {
        setError(reason.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
      } else {
        setError(reason instanceof Error ? reason.message : "Không thể cập nhật hồ sơ.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" value={email} disabled />
      </div>
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium">Tên hiển thị</label>
        <Input id="displayName" name="displayName" defaultValue={displayName} required />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
      <Button disabled={isLoading}>{isLoading ? "Đang lưu..." : "Lưu thay đổi"}</Button>
    </form>
  );
}
