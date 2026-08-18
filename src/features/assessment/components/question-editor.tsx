"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  Target,
  BarChart2,
  BookOpen,
  ArrowLeft,
  Settings,
  Layers,
  ChevronDown
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PromptBlock = {
  type: "text" | "markdown" | "html" | "audio" | "image";
  content: string;
  mediaId?: string | null;
};

type OptionItem = {
  id: string;
  text: string;
};

type QuestionEditorProps = {
  initialQuestion?: {
    questionId: string;
    programId: string;
    frameworkVersion: string;
    levelId: string;
    sectionType: string;
    skill: string;
    interactionType: string;
    difficulty: string;
    topicIds: string[];
    objectiveIds: string[];
    promptBlocks: PromptBlock[];
    options: OptionItem[];
    mediaRefs: string[];
    scoringDefinition: any;
    explanation: string;
    sourceRefs: string[];
    status: "draft" | "in_review" | "approved" | "published" | "retired";
    version?: number;
  };
  isNew?: boolean;
};

export function QuestionEditor({ initialQuestion, isNew = false }: QuestionEditorProps) {
  const router = useRouter();

  // Basic info state
  const [questionId, setQuestionId] = useState(initialQuestion?.questionId || "");
  const [programId, setProgramId] = useState(initialQuestion?.programId || "general-english-cefr");
  const [levelId, setLevelId] = useState(initialQuestion?.levelId || "a1");
  const [sectionType, setSectionType] = useState(initialQuestion?.sectionType || "grammar");
  const [skill, setSkill] = useState(initialQuestion?.skill || "grammar");
  const [difficulty, setDifficulty] = useState(initialQuestion?.difficulty || "a1");
  const [interactionType, setInteractionType] = useState(initialQuestion?.interactionType || "single_choice");
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || "");
  const [status, setStatus] = useState<"draft" | "in_review" | "approved" | "published" | "retired">(
    initialQuestion?.status || "draft"
  );

  // Lists & JSON state
  const [promptBlocks, setPromptBlocks] = useState<PromptBlock[]>(
    initialQuestion?.promptBlocks || [{ type: "text", content: "" }]
  );
  const [options, setOptions] = useState<OptionItem[]>(
    initialQuestion?.options || []
  );

  // Scoring configuration state
  const [correctOptionId, setCorrectOptionId] = useState<string>(
    initialQuestion?.scoringDefinition?.correctOptionId || ""
  );
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>(
    initialQuestion?.scoringDefinition?.correctOptionIds || []
  );
  const [correctAnswers, setCorrectAnswers] = useState<string>(
    initialQuestion?.scoringDefinition?.correctAnswers?.join(", ") || ""
  );
  const [correctTokenIds, setCorrectTokenIds] = useState<string>(
    initialQuestion?.scoringDefinition?.correctTokenIds?.join(", ") || ""
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync scoring inputs when options change
  useEffect(() => {
    if (options.length > 0) {
      if (interactionType === "single_choice" && !correctOptionId) {
        setCorrectOptionId(options[0].id);
      }
    }
  }, [options, interactionType, correctOptionId]);

  // Prompt block handlers
  const addPromptBlock = () => {
    setPromptBlocks([...promptBlocks, { type: "text", content: "" }]);
  };

  const removePromptBlock = (idx: number) => {
    setPromptBlocks(promptBlocks.filter((_, i) => i !== idx));
  };

  const updatePromptBlock = (idx: number, field: keyof PromptBlock, value: string) => {
    setPromptBlocks(
      promptBlocks.map((block, i) => (i === idx ? { ...block, [field]: value } : block))
    );
  };

  // Option handlers
  const addOption = () => {
    const nextId = `opt-${options.length + 1}`;
    setOptions([...options, { id: nextId, text: "" }]);
  };

  const removeOption = (idx: number) => {
    const removedOption = options[idx];
    setOptions(options.filter((_, i) => i !== idx));
    // clean up references in correct options
    if (removedOption) {
      setCorrectOptionIds(correctOptionIds.filter((id) => id !== removedOption.id));
      if (correctOptionId === removedOption.id) {
        setCorrectOptionId("");
      }
    }
  };

  const updateOption = (idx: number, field: keyof OptionItem, value: string) => {
    setOptions(options.map((opt, i) => (i === idx ? { ...opt, [field]: value } : opt)));
  };

  const toggleCorrectOptionId = (id: string) => {
    if (correctOptionIds.includes(id)) {
      setCorrectOptionIds(correctOptionIds.filter((item) => item !== id));
    } else {
      setCorrectOptionIds([...correctOptionIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Build scoringDefinition based on interactionType
    let scoringDefinition: any = {};
    if (interactionType === "single_choice") {
      scoringDefinition = { correctOptionId };
    } else if (interactionType === "multiple_choice") {
      scoringDefinition = { correctOptionIds };
    } else if (interactionType === "gap_fill") {
      scoringDefinition = {
        correctAnswers: correctAnswers
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      };
    } else if (interactionType === "reorder_tokens") {
      scoringDefinition = {
        correctTokenIds: correctTokenIds
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
    }

    // Basic client validation
    if (!questionId.trim()) {
      setError("Vui lòng điền Question ID");
      setIsSubmitting(false);
      return;
    }
    if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(questionId)) {
      setError("Question ID phải ở định dạng kebab-case (chỉ chữ thường, số, gạch nối, gạch dưới)");
      setIsSubmitting(false);
      return;
    }
    if (promptBlocks.length === 0 || promptBlocks.some((b) => !b.content.trim())) {
      setError("Mỗi prompt block phải chứa nội dung văn bản");
      setIsSubmitting(false);
      return;
    }
    if ((interactionType === "single_choice" || interactionType === "multiple_choice") && options.length === 0) {
      setError("Loại câu hỏi trắc nghiệm phải có ít nhất một lựa chọn");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      questionId,
      programId,
      frameworkVersion: "2020",
      levelId,
      sectionType,
      skill,
      interactionType,
      difficulty,
      topicIds: [],
      objectiveIds: [],
      promptBlocks,
      options,
      mediaRefs: [],
      scoringDefinition,
      explanation,
      sourceRefs: [],
      status,
    };

    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi lưu câu hỏi");
      }

      setSuccess(`Lưu câu hỏi thành công! Tạo phiên bản: ${data.versionDocId} (v${data.version})`);
      if (isNew) {
        setTimeout(() => {
          router.push(`/admin/questions/${questionId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </button>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono">
          {isNew ? "Tạo câu hỏi mới" : `Đang chỉnh sửa: ${questionId}`}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core Settings */}
        <Card className="shadow-sm border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
              <Settings className="size-5" />
              Cấu hình cơ bản
            </CardTitle>
            <CardDescription>
              Thiết lập thông tin nhận diện, kỹ năng và phân loại của câu hỏi.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Question ID *
              </label>
              <Input
                placeholder="Ví dụ: eng-grammar-be-1"
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                disabled={!isNew}
                required
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Chỉ cho phép chữ thường, số, dấu gạch nối/dưới. Không thể sửa sau khi tạo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Chương trình học (Program)
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
              >
                <option value="general-english-cefr">General English (CEFR)</option>
                <option value="japanese-communication-jf">Japanese Communication (JF)</option>
                <option value="chinese-foundation-gf0025">Chinese Foundation (GF)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trình độ (Level)
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
              >
                <option value="a1">A1</option>
                <option value="a2">A2</option>
                <option value="b1">B1</option>
                <option value="b2">B2</option>
                <option value="c1">C1</option>
                <option value="level-1">N5 / Level 1</option>
                <option value="level-2">N4 / Level 2</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Độ khó (Difficulty)
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="a1">A1 / Rất Dễ</option>
                <option value="a2">A2 / Dễ</option>
                <option value="b1">B1 / Trung Bình</option>
                <option value="b2">B2 / Khó</option>
                <option value="c1">C1 / Rất Khó</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Kỹ năng (Skill)
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={skill}
                onChange={(e) => {
                  setSkill(e.target.value);
                  setSectionType(e.target.value);
                }}
              >
                <option value="grammar">Grammar & Syntax</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="reading">Reading Comprehension</option>
                <option value="listening">Listening Comprehension</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Loại tương tác (Interaction Type)
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
              >
                <option value="single_choice">Single Choice (Trắc nghiệm 1 đáp án)</option>
                <option value="multiple_choice">Multiple Choice (Trắc nghiệm nhiều đáp án)</option>
                <option value="gap_fill">Gap Fill (Điền vào chỗ trống)</option>
                <option value="reorder_tokens">Reorder Tokens (Sắp xếp từ thành câu)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Blocks */}
        <Card className="shadow-sm border-2 border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                <HelpCircle className="size-5" />
                Khối nội dung câu hỏi (Prompt Blocks)
              </CardTitle>
              <CardDescription>
                Thêm văn bản, markdown hoặc tài nguyên để tạo đề bài.
              </CardDescription>
            </div>
            <Button type="button" size="sm" onClick={addPromptBlock} variant="outline">
              <Plus className="size-4 mr-1.5" />
              Thêm khối
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {promptBlocks.map((block, idx) => (
              <div key={idx} className="flex gap-3 items-start p-4 rounded-xl border bg-muted/20">
                <div className="w-32 shrink-0 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Loại khối</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border bg-background text-xs"
                    value={block.type}
                    onChange={(e) => updatePromptBlock(idx, "type", e.target.value as any)}
                  >
                    <option value="text">Text thường</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="image">Image (URL)</option>
                    <option value="audio">Audio (URL)</option>
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nội dung khối bài</label>
                  <textarea
                    placeholder="Nhập nội dung văn bản đề bài hoặc URL hình ảnh/âm thanh..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={block.content}
                    onChange={(e) => updatePromptBlock(idx, "content", e.target.value)}
                  />
                </div>

                {promptBlocks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 text-red-500 hover:text-red-700"
                    onClick={() => removePromptBlock(idx)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Options Editor (Only show for single_choice or multiple_choice or reorder_tokens) */}
        {(interactionType === "single_choice" ||
          interactionType === "multiple_choice" ||
          interactionType === "reorder_tokens") && (
          <Card className="shadow-sm border-2 border-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                  <Layers className="size-5" />
                  Lựa chọn / Tokens (Options)
                </CardTitle>
                <CardDescription>
                  Tạo các nhãn / câu trả lời để người học chọn hoặc sắp xếp.
                </CardDescription>
              </div>
              <Button type="button" size="sm" onClick={addOption} variant="outline">
                <Plus className="size-4 mr-1.5" />
                Thêm lựa chọn
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {options.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground border-2 border-dashed rounded-xl">
                  Chưa có lựa chọn nào. Hãy nhấn "Thêm lựa chọn" để bắt đầu.
                </div>
              ) : (
                options.map((opt, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="w-24 shrink-0">
                      <Input
                        placeholder="ID (ví dụ: opt-1)"
                        value={opt.id}
                        onChange={(e) => updateOption(idx, "id", e.target.value)}
                        className="font-mono text-xs h-9"
                        required
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Nội dung hiển thị..."
                        value={opt.text}
                        onChange={(e) => updateOption(idx, "text", e.target.value)}
                        className="text-xs h-9"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Scoring Definition Configuration */}
        <Card className="shadow-sm border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
              <CheckCircle2 className="size-5" />
              Đáp án & Cách tính điểm (Scoring Definition)
            </CardTitle>
            <CardDescription>
              Xác định đáp án chính xác dựa trên loại câu hỏi đã chọn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {interactionType === "single_choice" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Lựa chọn đúng (Correct Option)
                </label>
                {options.length === 0 ? (
                  <p className="text-xs text-yellow-600 font-semibold">Vui lòng thêm lựa chọn trước.</p>
                ) : (
                  <select
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                    value={correctOptionId}
                    onChange={(e) => setCorrectOptionId(e.target.value)}
                  >
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.id} — {opt.text}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {interactionType === "multiple_choice" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Các lựa chọn đúng (Chọn tất cả)
                </label>
                {options.length === 0 ? (
                  <p className="text-xs text-yellow-600 font-semibold">Vui lòng thêm lựa chọn trước.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {options.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 p-3 border rounded-xl hover:bg-muted/30 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={correctOptionIds.includes(opt.id)}
                          onChange={() => toggleCorrectOptionId(opt.id)}
                          className="rounded text-primary focus:ring-primary size-4"
                        />
                        <span className="font-mono font-semibold">{opt.id}</span>
                        <span className="text-muted-foreground truncate">({opt.text})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {interactionType === "gap_fill" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Đáp án điền khuyết (Correct Answers)
                </label>
                <Input
                  placeholder="Ví dụ: is, am, are"
                  value={correctAnswers}
                  onChange={(e) => setCorrectAnswers(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Các từ được ngăn cách bởi dấu phẩy nếu câu có nhiều chỗ trống. Không phân biệt chữ hoa/thường khi so khớp.
                </p>
              </div>
            )}

            {interactionType === "reorder_tokens" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Thứ tự đúng của Tokens (Correct Token IDs)
                </label>
                <Input
                  placeholder="Ví dụ: i, like, english"
                  value={correctTokenIds}
                  onChange={(e) => setCorrectTokenIds(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground italic">
                  Các ID token được đặt đúng thứ tự và ngăn cách bởi dấu phẩy. Ví dụ: `opt-1, opt-2, opt-3`.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Explanation & Review status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm border-2 border-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                <Target className="size-5" />
                Giải thích đáp án
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Nhập giải thích ngữ pháp hoặc đáp án để người học tham khảo sau khi thi xong..."
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-2 border-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary font-bold">
                Trạng thái duyệt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Trạng thái (Status)
                </label>
                <select
                  className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="draft">Draft (Bản nháp)</option>
                  <option value="in_review">In Review (Đang duyệt)</option>
                  <option value="approved">Approved (Đã duyệt)</option>
                  <option value="published">Published (Đang phát hành)</option>
                  <option value="retired">Retired (Đã gỡ bỏ)</option>
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
              >
                <Save className="size-4" />
                {isSubmitting ? "Đang lưu..." : "Lưu phiên bản"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
