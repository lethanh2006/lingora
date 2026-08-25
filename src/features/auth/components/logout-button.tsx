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
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration("/");
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await fetch("/api/push/subscription", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            }).catch(() => null);
            await subscription.unsubscribe().catch(() => false);
          }
        }
      } catch {
        // Push cleanup must never prevent a user from signing out.
      }
      await signOut(getFirebaseAuth());
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <Button className="h-11" variant="ghost" size="sm" onClick={logout} disabled={isLoading}>
      <LogOut className="size-4" aria-hidden="true" />
      {isLoading ? "Đang thoát..." : "Đăng xuất"}
    </Button>
  );
}
