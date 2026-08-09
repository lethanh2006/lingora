"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout() {
    setIsLoading(true);
    try {
      await signOut(getFirebaseAuth());
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout} disabled={isLoading}>
      <LogOut className="size-4" aria-hidden="true" />
      {isLoading ? "Đang thoát..." : "Đăng xuất"}
    </Button>
  );
}
