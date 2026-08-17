import type { Metadata } from "next";
import { Settings, UserCircle, Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/user/components/profile-form";
import { EnrollmentPrefsForm } from "@/features/enrollment/components/enrollment-prefs-form";
import { requireUser } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, USER_SUBCOLLECTIONS } from "@/lib/firebase/collections";

export const metadata: Metadata = { title: "Cài đặt – Lingora" };

export default async function SettingsPage() {
  const user = await requireUser();
  const db = getAdminDb();

  // Fetch first active enrollment for prefs
  const enrollmentsSnap = await db
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .collection(USER_SUBCOLLECTIONS.enrollments)
    .where("status", "==", "active")
    .limit(1)
    .get();

  let activeEnrollment: {
    programId: string;
    goalType: string | null;
    targetLevelId: string | null;
    dailyGoalMinutes: number;
  } | null = null;

  if (!enrollmentsSnap.empty) {
    const data = enrollmentsSnap.docs[0].data();
    activeEnrollment = {
      programId: enrollmentsSnap.docs[0].id,
      goalType: data.goalType ?? null,
      targetLevelId: data.targetLevelId ?? null,
      dailyGoalMinutes: data.dailyGoalMinutes ?? 15,
    };
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
          <Settings className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Cài đặt</h1>
          <p className="text-sm text-muted-foreground">Quản lý hồ sơ và tùy chọn học tập của bạn</p>
        </div>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCircle className="size-5 text-primary" />
            <CardTitle>Hồ sơ cá nhân</CardTitle>
          </div>
          <CardDescription>Thông tin hiển thị trong ứng dụng Lingora.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm displayName={user.displayName} email={user.email} />
        </CardContent>
      </Card>

      {/* Learning Preferences Section */}
      {activeEnrollment ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <CardTitle>Mục tiêu học tập</CardTitle>
            </div>
            <CardDescription>
              Điều chỉnh mục tiêu, trình độ và số phút học mỗi ngày. Lingora sẽ tùy chỉnh lộ trình phù hợp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollmentPrefsForm
              programId={activeEnrollment.programId}
              currentGoalType={activeEnrollment.goalType}
              currentLevelId={activeEnrollment.targetLevelId}
              currentDailyMinutes={activeEnrollment.dailyGoalMinutes}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="size-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Bạn chưa đăng ký chương trình học nào.</p>
            <p className="text-xs mt-1">
              Vào <strong>/learn</strong> để chọn chương trình phù hợp.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
