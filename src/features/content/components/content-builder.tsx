"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  Layers,
  FileText,
  Plus,
  Edit2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Trash2,
  Save,
  X
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Course = {
  id: string;
  title: string;
  summary: string;
  status: string;
};

type Unit = {
  id: string;
  courseId: string;
  title: string;
  order: number;
};

type Lesson = {
  id: string;
  unitId: string;
  title: string;
  summary: string;
  status: string;
  activityRefs: string[];
  vocabularyRefs: string[];
  sourceRefs: string[];
};

type ContentBuilderProps = {
  courses: Course[];
  units: Unit[];
  lessons: Lesson[];
};

export function ContentBuilder({ courses, units, lessons }: ContentBuilderProps) {
  const router = useRouter();

  // Selected item states
  const [activeCourseId, setActiveCourseId] = useState<string | null>(courses[0]?.id || null);

  // Edit / Form states
  const [editType, setEditType] = useState<"course" | "unit" | "lesson" | null>(null);
  const [editItem, setEditItem] = useState<any>(null); // holds data for editing/creating
  const [isNew, setIsNew] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter units and lessons
  const filteredUnits = units
    .filter((u) => u.courseId === activeCourseId)
    .sort((a, b) => a.order - b.order);

  const getLessonsForUnit = (unitId: string) => {
    return lessons
      .filter((l) => l.unitId === unitId)
      .sort((a, b) => {
        // Fallback to order if exists or index
        const orderA = (a as any).order ?? 0;
        const orderB = (b as any).order ?? 0;
        return orderA - orderB;
      });
  };

  // Reordering handlers
  const handleReorder = async (type: "unit" | "lesson", itemsList: any[]) => {
    const updatedItems = itemsList.map((item, idx) => ({
      id: item.id,
      order: idx,
    }));

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder_hierarchy",
          type,
          items: updatedItems,
        }),
      });

      if (!res.ok) throw new Error("Reorder failed");
      router.refresh();
    } catch (err) {
      alert("Lỗi khi sắp xếp thứ tự: " + err);
    }
  };

  const moveItem = (type: "unit" | "lesson", list: any[], index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    handleReorder(type, newList);
  };

  // Create & Edit form handlers
  const handleStartCreateCourse = () => {
    setEditType("course");
    setIsNew(true);
    setEditItem({
      id: "",
      programId: "general-english-cefr",
      levelId: "a1",
      title: "",
      description: "",
      coverMediaId: null,
      estimatedMinutes: 300,
      status: "draft",
      order: courses.length,
    });
  };

  const handleStartEditCourse = (course: Course) => {
    setEditType("course");
    setIsNew(false);
    setEditItem({
      id: course.id,
      programId: (course as any).programId || "general-english-cefr",
      levelId: (course as any).levelId || "a1",
      title: course.title,
      description: course.summary,
      coverMediaId: (course as any).coverMediaId || null,
      estimatedMinutes: (course as any).estimatedMinutes || 300,
      status: course.status,
      order: (course as any).order || 0,
      updatedAt: (course as any).updatedAt,
    });
  };

  const handleStartCreateUnit = () => {
    if (!activeCourseId) return;
    setEditType("unit");
    setIsNew(true);
    setEditItem({
      id: "",
      courseId: activeCourseId,
      title: "",
      description: "",
      order: filteredUnits.length,
      status: "draft",
    });
  };

  const handleStartEditUnit = (unit: Unit) => {
    setEditType("unit");
    setIsNew(false);
    setEditItem({
      id: unit.id,
      courseId: unit.courseId,
      title: unit.title,
      description: (unit as any).description || "",
      order: unit.order,
      status: (unit as any).status || "draft",
      updatedAt: (unit as any).updatedAt,
    });
  };

  const handleStartCreateLesson = (unitId: string) => {
    const existing = getLessonsForUnit(unitId);
    setEditType("lesson");
    setIsNew(true);
    setEditItem({
      id: "",
      unitId,
      title: "",
      summary: "",
      objectives: [""],
      estimatedMinutes: 20,
      order: existing.length,
      activityRefs: [],
      vocabularyRefs: [],
      sourceRefs: [],
      status: "draft",
      validationReport: { errors: [], warnings: [], validatedAt: null },
    });
  };

  const handleStartEditLesson = (lesson: Lesson) => {
    setEditType("lesson");
    setIsNew(false);
    setEditItem({
      id: lesson.id,
      unitId: lesson.unitId,
      title: lesson.title,
      summary: lesson.summary,
      objectives: (lesson as any).objectives || [""],
      estimatedMinutes: (lesson as any).estimatedMinutes || 20,
      order: (lesson as any).order || 0,
      activityRefs: lesson.activityRefs || [],
      vocabularyRefs: lesson.vocabularyRefs || [],
      sourceRefs: lesson.sourceRefs || [],
      status: lesson.status,
      validationReport: (lesson as any).validationReport || { errors: [], warnings: [], validatedAt: null },
      updatedAt: (lesson as any).updatedAt,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!editItem.id || !/^[a-z0-9-]+$/.test(editItem.id)) {
      setError("ID phải có dạng kebab-case (chữ thường, số, dấu gạch nối).");
      setIsSubmitting(false);
      return;
    }

    const action = `save_${editType}`;
    const payloadKey = editType;

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          [payloadKey!]: editItem,
          clientUpdatedAt: editItem.updatedAt || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Xung đột dữ liệu: Một người dùng khác đã chỉnh sửa tài liệu này kể từ khi bạn mở nó. Vui lòng tải lại trang để cập nhật dữ liệu mới nhất.");
        }
        throw new Error(data.error || "Gặp lỗi khi lưu học liệu");
      }

      setEditType(null);
      setEditItem(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Lỗi lưu học liệu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Course Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground uppercase">Khóa học (Courses)</h3>
            <Button variant="ghost" size="icon" onClick={handleStartCreateCourse} className="size-8">
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => setActiveCourseId(course.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-semibold border transition ${
                  activeCourseId === course.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder className="size-4 shrink-0" />
                  <span className="truncate">{course.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEditCourse(course);
                  }}
                  className={`size-6 rounded ${
                    activeCourseId === course.id
                      ? "hover:bg-primary-foreground/10 text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Edit2 className="size-3" />
                </Button>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Units & Lessons hierarchy */}
        <div className="lg:col-span-3 space-y-6">
          {activeCourseId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-muted-foreground uppercase">Cấu trúc Unit & Bài học</h3>
                <Button onClick={handleStartCreateUnit} className="flex items-center gap-1.5 shadow-sm text-xs h-8">
                  <Plus className="size-3.5" />
                  Thêm Unit mới
                </Button>
              </div>

              {filteredUnits.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
                  <Layers className="size-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Khóa học này chưa có Unit nào.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredUnits.map((unit, uIdx) => {
                    const unitLessons = getLessonsForUnit(unit.id);
                    return (
                      <div key={unit.id} className="border rounded-2xl bg-background overflow-hidden shadow-sm">
                        {/* Unit Header */}
                        <div className="flex items-center justify-between p-4 bg-muted/20 border-b">
                          <div className="flex items-center gap-2">
                            <Layers className="size-4 text-primary shrink-0" />
                            <h4 className="font-bold text-sm text-foreground">{unit.title}</h4>
                            <span className="font-mono text-2xs text-muted-foreground font-semibold">({unit.id})</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Reordering Unit buttons */}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={uIdx === 0}
                              onClick={() => moveItem("unit", filteredUnits, uIdx, "up")}
                              className="size-7"
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={uIdx === filteredUnits.length - 1}
                              onClick={() => moveItem("unit", filteredUnits, uIdx, "down")}
                              className="size-7"
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEditUnit(unit)}
                              className="size-7"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartCreateLesson(unit.id)}
                              className="text-xs h-7 px-2.5 ml-1"
                            >
                              <Plus className="size-3 mr-1" /> Thêm Lesson
                            </Button>
                          </div>
                        </div>

                        {/* Lessons List under Unit */}
                        <div className="divide-y">
                          {unitLessons.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground italic">
                              Chưa có bài học nào trong Unit này.
                            </div>
                          ) : (
                            unitLessons.map((lesson, lIdx) => (
                              <div key={lesson.id} className="flex items-center justify-between p-3.5 pl-6 hover:bg-muted/10 transition">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                                    <h5 className="font-semibold text-xs text-foreground">{lesson.title}</h5>
                                    <span className="font-mono text-3xs text-muted-foreground">({lesson.id})</span>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                                      {lesson.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1">{lesson.summary}</p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Reordering Lesson buttons */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={lIdx === 0}
                                    onClick={() => moveItem("lesson", unitLessons, lIdx, "up")}
                                    className="size-7"
                                  >
                                    <ArrowUp className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={lIdx === unitLessons.length - 1}
                                    onClick={() => moveItem("lesson", unitLessons, lIdx, "down")}
                                    className="size-7"
                                  >
                                    <ArrowDown className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartEditLesson(lesson)}
                                    className="size-7"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              Vui lòng chọn hoặc tạo một khóa học để xem cấu trúc.
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal / overlay */}
      {editType && editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <div>
                <CardTitle className="text-base font-bold text-primary">
                  {isNew ? `Tạo ${editType} mới` : `Chỉnh sửa ${editType}`}
                </CardTitle>
                <CardDescription>
                  Điền các thông tin của học liệu.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setEditType(null); setEditItem(null); }}>
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">ID {editType} *</label>
                  <Input
                    placeholder="Ví dụ: kebab-case-id"
                    value={editItem.id}
                    onChange={(e) => setEditItem({ ...editItem, id: e.target.value })}
                    disabled={!isNew}
                    className="font-mono text-sm"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Dùng chữ cái thường, số, gạch ngang. ID không thể thay đổi sau khi tạo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Tiêu đề (Title) *</label>
                  <Input
                    placeholder="Nhập tiêu đề học liệu..."
                    value={editItem.title}
                    onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                    required
                  />
                </div>

                {editType === "course" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Mô tả chi tiết *</label>
                      <textarea
                        placeholder="Mô tả tóm tắt nội dung khóa học..."
                        className="w-full p-2.5 border rounded-lg text-sm bg-background"
                        rows={4}
                        value={editItem.description}
                        onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Program ID</label>
                        <Input
                          value={editItem.programId}
                          onChange={(e) => setEditItem({ ...editItem, programId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Level ID</label>
                        <Input
                          value={editItem.levelId}
                          onChange={(e) => setEditItem({ ...editItem, levelId: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {editType === "unit" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Mô tả *</label>
                    <textarea
                      placeholder="Mô tả mục tiêu của unit..."
                      className="w-full p-2.5 border rounded-lg text-sm bg-background"
                      rows={3}
                      value={editItem.description}
                      onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                      required
                    />
                  </div>
                )}

                {editType === "lesson" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Tóm tắt bài học (Summary) *</label>
                      <textarea
                        placeholder="Nội dung tóm tắt bài học..."
                        className="w-full p-2.5 border rounded-lg text-sm bg-background"
                        rows={3}
                        value={editItem.summary}
                        onChange={(e) => setEditItem({ ...editItem, summary: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Thời gian ước tính (Phút)</label>
                      <Input
                        type="number"
                        value={editItem.estimatedMinutes}
                        onChange={(e) => setEditItem({ ...editItem, estimatedMinutes: Number(e.target.value) })}
                        required
                      />
                    </div>

                    {/* Objectives list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Mục tiêu bài học (Objectives)</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditItem({ ...editItem, objectives: [...editItem.objectives, ""] })}
                          className="h-7 px-2 text-xs"
                        >
                          Thêm mục tiêu
                        </Button>
                      </div>
                      {editItem.objectives.map((obj: string, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder={`Mục tiêu ${index + 1}`}
                            value={obj}
                            onChange={(e) => {
                              const newList = [...editItem.objectives];
                              newList[index] = e.target.value;
                              setEditItem({ ...editItem, objectives: newList });
                            }}
                            required
                          />
                          {editItem.objectives.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newList = editItem.objectives.filter((_: any, idx: number) => idx !== index);
                                setEditItem({ ...editItem, objectives: newList });
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* References lists */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase block">
                          Hoạt động (Activity IDs - Phẩy)
                        </label>
                        <Input
                          placeholder="Ví dụ: act-1, act-2"
                          value={editItem.activityRefs?.join(", ") || ""}
                          onChange={(e) => {
                            const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                            setEditItem({ ...editItem, activityRefs: list });
                          }}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase block">
                          Từ vựng (Lexeme IDs - Phẩy)
                        </label>
                        <Input
                          placeholder="Ví dụ: lex-1, lex-2"
                          value={editItem.vocabularyRefs?.join(", ") || ""}
                          onChange={(e) => {
                            const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                            setEditItem({ ...editItem, vocabularyRefs: list });
                          }}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase block">
                          Nguồn tham khảo (Source IDs - Phẩy)
                        </label>
                        <Input
                          placeholder="Ví dụ: source-1, source-2"
                          value={editItem.sourceRefs?.join(", ") || ""}
                          onChange={(e) => {
                            const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                            setEditItem({ ...editItem, sourceRefs: list });
                          }}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-3 border-t">
                  <Button type="button" variant="outline" onClick={() => { setEditType(null); setEditItem(null); }}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5">
                    <Save className="size-4" />
                    {isSubmitting ? "Đang lưu..." : "Lưu học liệu"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
