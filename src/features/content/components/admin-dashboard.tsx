"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Play, RefreshCw, Upload, Layout, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ContentBuilder } from "./content-builder";

type CourseDraft = {
  id: string;
  title: string;
  summary: string;
  status: string;
  currentPublishedRevisionId?: string;
};

type UnitDraft = {
  id: string;
  courseId: string;
  title: string;
  order: number;
};

type LessonDraft = {
  id: string;
  unitId: string;
  title: string;
  summary: string;
  status: string;
  activityRefs: string[];
  vocabularyRefs: string[];
  sourceRefs: string[];
  validationReport?: {
    errors: string[];
    warnings: string[];
    validatedAt?: string;
  };
};

export type AdminDashboardProps = {
  initialCourses: CourseDraft[];
  initialUnits: UnitDraft[];
  initialLessons: LessonDraft[];
};

export function AdminDashboard({
  initialCourses,
  initialUnits,
  initialLessons,
}: AdminDashboardProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [lessons, setLessons] = useState(initialLessons);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>({});
  const [rollbackRevision, setRollbackRevision] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"publish" | "builder">("publish");

  const handleValidate = async (lessonId: string) => {
    setLoadingId(`validate-${lessonId}`);
    try {
      const res = await fetch("/api/admin/content/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (res.ok) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  validationReport: {
                    errors: data.errors || [],
                    warnings: data.warnings || [],
                    validatedAt: new Date().toISOString(),
                  },
                }
              : l
          )
        );
      } else {
        alert(`Validation error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi kết nối: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handlePublishLesson = async (lessonId: string) => {
    setLoadingId(`publish-${lessonId}`);
    try {
      const res = await fetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_lesson", lessonId }),
      });
      const data = await res.json();
      if (res.ok) {
        setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, status: "published" } : l)));
        alert(`Đã xuất bản thành công! Revision ID: ${data.revisionId}`);
      } else {
        alert(`Publish error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi kết nối: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    setLoadingId(`publish-course-${courseId}`);
    try {
      const res = await fetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_course",
          courseId,
          releaseNotes: releaseNotes[courseId] || "Release mới",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, status: "published", currentPublishedRevisionId: data.revisionId }
              : c
          )
        );
        alert(`Đã xuất bản khóa học thành công! Revision ID: ${data.revisionId}`);
      } else {
        alert(`Publish error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi kết nối: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRollbackCourse = async (courseId: string) => {
    const revisionId = rollbackRevision[courseId];
    if (!revisionId) {
      alert("Vui lòng nhập ID revision cần rollback");
      return;
    }

    const reason = prompt(`Bạn có chắc chắn muốn rollback khóa học này về revision: ${revisionId}?\nHãy nhập lý do rollback:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do rollback để lưu vết!");
      return;
    }

    setLoadingId(`rollback-${courseId}`);
    try {
      const res = await fetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rollback_course",
          courseId,
          targetRevisionId: revisionId,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, currentPublishedRevisionId: data.currentPublishedRevisionId }
              : c
          )
        );
        alert(`Đã rollback khóa học về: ${data.currentPublishedRevisionId}`);
      } else {
        alert(`Rollback error: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi kết nối: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleWorkflowAction = async (lessonId: string, action: string, comment?: string) => {
    setLoadingId(`${action}-${lessonId}`);
    try {
      const res = await fetch("/api/admin/content/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, action, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === lessonId
              ? {
                  ...l,
                  status: data.status,
                  rejectionComment: data.rejectionComment,
                }
              : l
          )
        );
        alert("Cập nhật trạng thái thành công!");
      } else {
        alert(`Lỗi cập nhật workflow: ${data.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Lỗi kết nối: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === "publish"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layout className="size-4" />
          Biên dịch & Xuất bản
        </button>
        <button
          onClick={() => setActiveTab("builder")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition ${
            activeTab === "builder"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hammer className="size-4" />
          Cấu trúc Học liệu (Builder)
        </button>
      </div>

      {activeTab === "publish" ? (
        <div className="space-y-8">
          {/* COURSES MANAGMENT SECTION */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Danh sách Khóa học (Courses)</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {courses.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription className="text-xs">ID: {course.id}</CardDescription>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          course.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {course.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">{course.summary}</p>
                    {course.currentPublishedRevisionId && (
                      <div className="p-2.5 bg-background rounded-lg border text-xs font-mono text-muted-foreground">
                        Current Revision: {course.currentPublishedRevisionId}
                      </div>
                    )}

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ghi chú phát hành..."
                          className="flex-1 h-9 px-3 text-xs rounded-lg border bg-background"
                          value={releaseNotes[course.id] || ""}
                          onChange={(e) =>
                            setReleaseNotes((prev) => ({ ...prev, [course.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          disabled={loadingId === `publish-course-${course.id}`}
                          onClick={() => handlePublishCourse(course.id)}
                        >
                          {loadingId === `publish-course-${course.id}` ? "Đang xử lý..." : "Publish Course"}
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ID Revision cũ..."
                          className="flex-1 h-9 px-3 text-xs rounded-lg border bg-background"
                          value={rollbackRevision[course.id] || ""}
                          onChange={(e) =>
                            setRollbackRevision((prev) => ({ ...prev, [course.id]: e.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingId === `rollback-${course.id}`}
                          onClick={() => handleRollbackCourse(course.id)}
                        >
                          {loadingId === `rollback-${course.id}` ? "Đang xử lý..." : "Rollback Pointer"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* LESSONS MANAGEMENT SECTION */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Danh sách Bài học (Lessons)</h2>
            <div className="space-y-4">
              {lessons.map((lesson) => {
                const hasErrors = lesson.validationReport && lesson.validationReport.errors.length > 0;
                const validated = !!lesson.validationReport;

                return (
                  <div
                    key={lesson.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border bg-background hover:shadow-sm transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{lesson.title}</h3>
                        <span className="text-xs text-muted-foreground font-mono">({lesson.id})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase border ${
                            lesson.status === "published"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : lesson.status === "approved"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : lesson.status === "in_review"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : lesson.status === "retired"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {lesson.status === "published"
                            ? "Đã xuất bản"
                            : lesson.status === "approved"
                            ? "Đã duyệt"
                            : lesson.status === "in_review"
                            ? "Chờ duyệt"
                            : lesson.status === "retired"
                            ? "Gỡ bỏ"
                            : "Bản nháp"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{lesson.summary}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                        <span>
                          Unit: <strong>{lesson.unitId}</strong>
                        </span>
                        <span>
                          Từ vựng: <strong>{lesson.vocabularyRefs.length}</strong>
                        </span>
                        <span>
                          Hoạt động: <strong>{lesson.activityRefs.length}</strong>
                        </span>
                      </div>

                      {lesson.status === "draft" && (lesson as any).rejectionComment && (
                        <div className="mt-2 p-2.5 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-start gap-2 border border-rose-100">
                          <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                          <div>
                            <span className="font-bold">Lý do từ chối:</span>{" "}
                            {(lesson as any).rejectionComment}
                          </div>
                        </div>
                      )}

                      {/* Validation Report UI */}
                      {validated && (
                        <div className="mt-3 p-3 bg-muted/30 rounded-xl space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            {hasErrors ? (
                              <AlertTriangle className="size-4 text-red-500 shrink-0" />
                            ) : (
                              <CheckCircle className="size-4 text-green-500 shrink-0" />
                            )}
                            <span>Kết quả kiểm tra dữ liệu:</span>
                          </div>
                          {lesson.validationReport!.errors.length > 0 && (
                            <div className="text-red-600 pl-5 list-disc space-y-0.5">
                              {lesson.validationReport!.errors.map((e, idx) => (
                                <p key={idx}>• {e}</p>
                              ))}
                            </div>
                          )}
                          {lesson.validationReport!.warnings.length > 0 && (
                            <div className="text-yellow-600 pl-5 list-disc space-y-0.5">
                              {lesson.validationReport!.warnings.map((w, idx) => (
                                <p key={idx}>• {w}</p>
                              ))}
                            </div>
                          )}
                          {lesson.validationReport!.errors.length === 0 && (
                            <p className="text-green-600 pl-5 font-semibold">
                              Hợp lệ hoàn toàn, sẵn sàng xuất bản!
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingId === `validate-${lesson.id}`}
                        onClick={() => handleValidate(lesson.id)}
                      >
                        <RefreshCw
                          className={`size-3.5 mr-1.5 ${
                            loadingId === `validate-${lesson.id}` ? "animate-spin" : ""
                          }`}
                        />
                        Validate
                      </Button>

                      <Link href={`/admin/preview/lessons/${lesson.id}`}>
                        <Button variant="outline" size="sm">
                          <Play className="size-3.5 mr-1.5" />
                          Preview
                        </Button>
                      </Link>

                      {/* Submit Review */}
                      {lesson.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingId === `submit_review-${lesson.id}`}
                          onClick={() => handleWorkflowAction(lesson.id, "submit_review")}
                        >
                          Gửi duyệt
                        </Button>
                      )}

                      {/* Approve & Reject */}
                      {lesson.status === "in_review" && (
                        <>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="sm"
                            disabled={loadingId === `approve-${lesson.id}`}
                            onClick={() => handleWorkflowAction(lesson.id, "approve")}
                          >
                            Duyệt
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={loadingId === `reject-${lesson.id}`}
                            onClick={() => {
                              const comment = prompt("Nhập lý do từ chối bài học:");
                              if (comment === null) return;
                              if (!comment.trim()) {
                                alert("Vui lòng nhập lý do từ chối!");
                                return;
                              }
                              handleWorkflowAction(lesson.id, "reject", comment.trim());
                            }}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}

                      {/* Publish */}
                      {lesson.status === "approved" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={
                            loadingId === `publish-${lesson.id}` ||
                            !validated ||
                            hasErrors
                          }
                          onClick={() => handlePublishLesson(lesson.id)}
                        >
                          <Upload className="size-3.5 mr-1.5" />
                          Xuất bản
                        </Button>
                      )}

                      {/* Retire */}
                      {lesson.status === "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          disabled={loadingId === `retire-${lesson.id}`}
                          onClick={() => {
                            if (confirm("Bạn có chắc chắn muốn gỡ bỏ/lưu trữ bài học đã xuất bản này không?")) {
                              handleWorkflowAction(lesson.id, "retire");
                            }
                          }}
                        >
                          Gỡ bỏ
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <ContentBuilder courses={courses} units={initialUnits} lessons={lessons} />
      )}
    </div>
  );
}
