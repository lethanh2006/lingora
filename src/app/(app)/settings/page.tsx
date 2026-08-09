import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/user/components/profile-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Hồ sơ cá nhân</CardTitle>
        <CardDescription>Cập nhật thông tin hiển thị trong Lingora.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm displayName={user.displayName} email={user.email} />
      </CardContent>
    </Card>
  );
}
