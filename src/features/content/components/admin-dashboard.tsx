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
    setLoadingId(`rollback-${courseId}`);
    try {
      const res = await fetch("/api/admin/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rollback_course",
          courseId,
          targetRevisionId: revisionId,
          reason: "Rollback bằng Admin CMS",
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
                          className={`px-2 py-0.5 rounded-full text-2xs font-semibold uppercase ${
                            lesson.status === "published"
                              ? "bg-green-100 text-green-800"
                              : lesson.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {lesson.status}
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

                    <div className="flex items-center gap-2 shrink-0">
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

                      <Button
                        size="sm"
                        disabled={
                          loadingId === `publish-${lesson.id}` ||
                          lesson.status === "published" ||
                          !validated ||
                          hasErrors
                        }
                        onClick={() => handlePublishLesson(lesson.id)}
                      >
                        <Upload className="size-3.5 mr-1.5" />
                        Publish
                      </Button>
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
