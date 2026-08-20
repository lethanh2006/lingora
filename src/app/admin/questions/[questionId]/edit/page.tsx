import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { QuestionEditor } from "@/features/assessment/components/question-editor";
import { questionSchema } from "@/features/assessment/schemas/assessment.schema";

export const metadata: Metadata = { title: "Chỉnh sửa câu hỏi – Admin" };

interface EditQuestionPageProps {
  params: Promise<{ questionId: string }>;
}

export default async function AdminEditQuestionPage({ params }: EditQuestionPageProps) {
  await requireAdmin();
  const { questionId } = await params;
  const db = getAdminDb();

  const questionSnap = await db.collection(COLLECTIONS.questions).doc(questionId).get();
  if (!questionSnap.exists) notFound();

  let question;
  try {
    question = questionSchema.parse(questionSnap.data());
  } catch {
    notFound();
  }

  // Fetch all versions of this question to find the latest one
  const versionsSnap = await db
    .collection(COLLECTIONS.questionVersions)
    .where("questionId", "==", questionId)
    .get();

  if (versionsSnap.empty) {
    notFound();
  }

  const sortedDocs = [...versionsSnap.docs].sort((a, b) => b.data().version - a.data().version);
  const latestVersionDoc = sortedDocs[0];
  const latestVersion = latestVersionDoc.data();

  const mappedQuestion = {
    questionId: question.id,
    programId: latestVersion.programId || "general-english-cefr",
    frameworkVersion: latestVersion.frameworkVersion || "2020",
    levelId: latestVersion.levelId || "a1",
    sectionType: latestVersion.sectionType || "grammar",
    skill: latestVersion.skill || "grammar",
    interactionType: latestVersion.interactionType || "single_choice",
    difficulty: latestVersion.difficulty || "a1",
    topicIds: latestVersion.topicIds || [],
    objectiveIds: latestVersion.objectiveIds || [],
    promptBlocks: latestVersion.promptBlocks || [],
    options: latestVersion.options || [],
    mediaRefs: latestVersion.mediaRefs || [],
    scoringDefinition: latestVersion.scoringDefinition || {},
    explanation: latestVersion.explanation || "",
    sourceRefs: latestVersion.sourceRefs || [],
    status: question.status || "draft",
    version: latestVersion.version,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Chỉnh sửa câu hỏi
        </h1>
      </div>

      <QuestionEditor initialQuestion={mappedQuestion} isNew={false} />
    </div>
  );
}
