import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth/session";
import { QuestionEditor } from "@/features/assessment/components/question-editor";

export const metadata: Metadata = { title: "Thêm câu hỏi mới – Admin" };

export default async function AdminNewQuestionPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Thêm câu hỏi mới
        </h1>
      </div>

      <QuestionEditor isNew={true} />
    </div>
  );
}
