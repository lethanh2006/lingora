import type { Metadata } from "next";
import { Settings, UserCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PwaSettingsCard } from "@/features/notifications/components/pwa-settings-card";
import { AccountDeletionCard } from "@/features/user/components/account-deletion-card";
import { ProfileForm } from "@/features/user/components/profile-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cài đặt – Lingora" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-muted"><Settings className="size-5 text-muted-foreground" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1><p className="text-sm text-muted-foreground">Quản lý hồ sơ, ứng dụng và tài khoản của bạn.</p></div>
      </div>
      <Card>
        <CardHeader><div className="flex items-center gap-2"><UserCircle className="size-5 text-primary" /><CardTitle>Hồ sơ cá nhân</CardTitle></div><CardDescription>Thông tin hiển thị trong Lingora.</CardDescription></CardHeader>
        <CardContent><ProfileForm displayName={user.displayName} email={user.email} /></CardContent>
      </Card>
      <PwaSettingsCard vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <AccountDeletionCard />
    </div>
  );
}
