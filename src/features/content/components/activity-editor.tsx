"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  FolderPlus,
  Sparkles,
  Link,
  BookOpen
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Source = {
  id: string;
  title: string;
};

type ActivityEditorProps = {
  initialActivity?: any;
  availableSources: Source[];
};

const ACTIVITY_TYPES = [
  { value: "explanation", label: "Explanation (Giải thích lý thuyết)" },
  { value: "vocabulary_card", label: "Vocabulary Card (Thẻ học từ vựng)" },
  { value: "single_choice", label: "Single Choice (Trắc nghiệm 1 đáp án)" },
  { value: "gap_fill", label: "Gap Fill (Điền vào chỗ trống)" },
  { value: "reorder_tokens", label: "Reorder Tokens (Sắp xếp từ)" },
  { value: "listening_choice", label: "Listening Choice (Nghe chọn đáp án)" },
] as const;

export function ActivityEditor({ initialActivity, availableSources }: ActivityEditorProps) {
  const router = useRouter();

  // Core metadata fields
  const [id, setId] = useState(initialActivity?.id || "");
  const [type, setType] = useState(initialActivity?.type || "explanation");
  const [instruction, setInstruction] = useState(initialActivity?.instruction || "");
  const [prompt, setPrompt] = useState(initialActivity?.prompt || "");
  const [skill, setSkill] = useState(initialActivity?.skill || "reading");
  const [difficulty, setDifficulty] = useState(initialActivity?.difficulty || "a1");
  const [estimatedSeconds, setEstimatedSeconds] = useState(initialActivity?.estimatedSeconds || 120);
  const [required, setRequired] = useState(initialActivity?.required ?? true);
  const [selectedSources, setSelectedSources] = useState<string[]>(initialActivity?.sourceRefs || []);

  // 1. Explanation specific fields
  const [explanationBody, setExplanationBody] = useState(initialActivity?.body || "");

  // 2. Vocabulary Card specific fields
  const [vocabEntries, setVocabEntries] = useState<any[]>(
    initialActivity?.entries || [
      { lexemeId: "", term: "", meaningVi: "", pronunciation: "", example: "", mediaRefs: [] },
    ]
  );

  // 3. Single Choice & Listening Choice fields
  const [options, setOptions] = useState<any[]>(
    initialActivity?.options || [
      { id: "opt-1", text: "" },
      { id: "opt-2", text: "" },
    ]
  );
  const [correctOptionId, setCorrectOptionId] = useState(
    initialActivity?.scoringDefinition?.correctOptionId || "opt-1"
  );
  const [listeningAudioId, setListeningAudioId] = useState(initialActivity?.audioMediaId || "");
  const [listeningTranscript, setListeningTranscript] = useState(initialActivity?.transcript || "");

  // 4. Gap Fill specific fields
  const [gapTemplate, setGapTemplate] = useState(initialActivity?.template || "");
  const [gaps, setGaps] = useState<any[]>(
    initialActivity?.gaps || [{ id: "gap-1", placeholder: "..." }]
  );
  const [gapAnswers, setGapAnswers] = useState<any[]>(
    initialActivity?.scoringDefinition?.answers || [
      {
        gapId: "gap-1",
        acceptedAnswers: [""],
        caseSensitive: false,
        kanaEquivalence: false,
        traditionalEquivalence: false,
        tonePolicy: "ignore",
      },
    ]
  );

  // 5. Reorder Tokens fields
  const [tokens, setTokens] = useState<any[]>(
    initialActivity?.tokens || [
      { id: "tok-1", text: "" },
      { id: "tok-2", text: "" },
    ]
  );
  const [correctTokenIds, setCorrectTokenIds] = useState<string[]>(
    initialActivity?.scoringDefinition?.correctTokenIds || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Form Handlers
  const handleTypeChange = (newType: string) => {
    setType(newType);
  };

  const handleSourceToggle = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  // Helpers for vocabulary list
  const addVocabEntry = () => {
    setVocabEntries((prev) => [
      ...prev,
      { lexemeId: "", term: "", meaningVi: "", pronunciation: "", example: "", mediaRefs: [] },
    ]);
  };

  const removeVocabEntry = (index: number) => {
    setVocabEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateVocabEntry = (index: number, fields: any) => {
    setVocabEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, ...fields } : entry))
    );
  };

  // Helpers for options
  const addOption = () => {
    const nextNum = options.length + 1;
    setOptions((prev) => [...prev, { id: `opt-${nextNum}`, text: "" }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateOptionText = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? { ...opt, text } : opt))
    );
  };

  // Helpers for tokens
  const addToken = () => {
    const nextNum = tokens.length + 1;
    setTokens((prev) => [...prev, { id: `tok-${nextNum}`, text: "" }]);
  };

  const removeToken = (index: number) => {
    if (tokens.length <= 2) return;
    setTokens((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateTokenText = (index: number, text: string) => {
    setTokens((prev) =>
      prev.map((tok, idx) => (idx === index ? { ...tok, text } : tok))
    );
  };

  // Helpers for gaps
  const addGap = () => {
    const nextNum = gaps.length + 1;
    const gapId = `gap-${nextNum}`;
    setGaps((prev) => [...prev, { id: gapId, placeholder: "..." }]);
    setGapAnswers((prev) => [
      ...prev,
      {
        gapId,
        acceptedAnswers: [""],
        caseSensitive: false,
        kanaEquivalence: false,
        traditionalEquivalence: false,
        tonePolicy: "ignore",
      },
    ]);
  };

  const removeGap = (index: number) => {
    if (gaps.length <= 1) return;
    const gapIdToRemove = gaps[index].id;
    setGaps((prev) => prev.filter((_, idx) => idx !== index));
    setGapAnswers((prev) => prev.filter((ans) => ans.gapId !== gapIdToRemove));
  };

  const updateGapPlaceholder = (index: number, placeholder: string) => {
    setGaps((prev) =>
      prev.map((g, idx) => (idx === index ? { ...g, placeholder } : g))
    );
  };

  const updateGapAnswerField = (gapId: string, fields: any) => {
    setGapAnswers((prev) =>
      prev.map((ans) => (ans.gapId === gapId ? { ...ans, ...fields } : ans))
    );
  };

  const handleSave = async () => {
    setError(null);

    // Frontend Validations
    if (!id || !/^[a-z0-9-]+$/.test(id)) {
      setError("ID hoạt động phải có dạng kebab-case (chỉ gồm chữ thường, số, dấu gạch ngang).");
      return;
    }
    if (!instruction) {
      setError("Vui lòng nhập hướng dẫn làm bài.");
      return;
    }
    if (selectedSources.length === 0) {
      setError("Vui lòng chọn ít nhất một nguồn tham khảo.");
      return;
    }

    // Build payload according to activity type
    let typeSpecificPayload: any = {};
    if (type === "explanation") {
      if (!explanationBody) {
        setError("Vui lòng nhập nội dung lý thuyết.");
        return;
      }
      typeSpecificPayload = { body: explanationBody };
    } else if (type === "vocabulary_card") {
      if (vocabEntries.length === 0 || vocabEntries.some((e) => !e.lexemeId || !e.term || !e.meaningVi)) {
        setError("Vui lòng điền đầy đủ các mục từ vựng (Lexeme ID, Từ vựng, Ý nghĩa).");
        return;
      }
      typeSpecificPayload = { entries: vocabEntries };
    } else if (type === "single_choice") {
      if (options.some((o) => !o.text)) {
        setError("Vui lòng nhập nội dung cho tất cả các lựa chọn.");
        return;
      }
      typeSpecificPayload = {
        options,
        scoringDefinition: {
          kind: "exact_single_choice",
          correctOptionId,
        },
      };
    } else if (type === "listening_choice") {
      if (!listeningAudioId) {
        setError("Vui lòng nhập Audio Media ID.");
        return;
      }
      if (!listeningTranscript) {
        setError("Vui lòng nhập bản phiên âm.");
        return;
      }
      if (options.some((o) => !o.text)) {
        setError("Vui lòng nhập nội dung cho tất cả các lựa chọn.");
        return;
      }
      typeSpecificPayload = {
        audioMediaId: listeningAudioId,
        transcript: listeningTranscript,
        options,
        scoringDefinition: {
          kind: "exact_single_choice",
          correctOptionId,
        },
      };
    } else if (type === "gap_fill") {
      if (!gapTemplate) {
        setError("Vui lòng nhập Template điền từ.");
        return;
      }
      if (gaps.some((g) => !g.id)) {
        setError("Vui lòng nhập ID cho tất cả các khoảng trống.");
        return;
      }
      if (gapAnswers.some((a) => a.acceptedAnswers.some((ans: string) => !ans))) {
        setError("Vui lòng nhập ít nhất một câu trả lời được chấp nhận cho mỗi gap.");
        return;
      }
      typeSpecificPayload = {
        template: gapTemplate,
        gaps,
        scoringDefinition: {
          kind: "accepted_gap_answers",
          answers: gapAnswers,
        },
      };
    } else if (type === "reorder_tokens") {
      if (tokens.some((t) => !t.text)) {
        setError("Vui lòng nhập nội dung cho tất cả các token.");
        return;
      }
      if (correctTokenIds.length !== tokens.length) {
        setError("Vui lòng định nghĩa đầy đủ thứ tự chính xác của các tokens.");
        return;
      }
      typeSpecificPayload = {
        tokens,
        scoringDefinition: {
          kind: "exact_token_sequence",
          correctTokenIds,
        },
      };
    }

    const payload = {
      id,
      type,
      instruction,
      prompt,
      skill,
      difficulty,
      estimatedSeconds: Number(estimatedSeconds),
      required,
      sourceRefs: selectedSources,
      ...typeSpecificPayload,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Lưu hoạt động thất bại.");
      }

      router.push("/admin/content");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Lỗi lưu hoạt động.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 rounded-xl">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {initialActivity ? `Chỉnh sửa hoạt động: ${id}` : "Thêm hoạt động mới"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Tạo và thiết kế các bài tập tương tác trong bài học.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="flex items-center gap-1.5 shadow-sm">
          <Save className="size-4" />
          {isSubmitting ? "Đang lưu..." : "Lưu hoạt động"}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-rose-200">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Thông tin chung & Nội dung đề bài
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    ID Hoạt động *
                  </label>
                  <Input
                    placeholder="Ví dụ: en-l1-act-1"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={!!initialActivity}
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Chỉ chữ cái thường, số, gạch ngang.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Loại tương tác
                  </label>
                  <select
                    className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={!!initialActivity}
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Hướng dẫn làm bài (Instruction) *
                </label>
                <Input
                  placeholder="Ví dụ: Đọc văn bản sau và chọn đáp án chính xác nhất."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Đề bài câu hỏi (Prompt)
                </label>
                <textarea
                  placeholder="Nhập đề bài chi tiết hoặc nội dung dẫn dắt..."
                  className="w-full p-3 border rounded-lg text-sm bg-background"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* DYNAMIC ACTIVITY INPUT FIELDS */}
          {type === "explanation" && (
            <Card className="border-emerald-100">
              <CardHeader className="pb-3 border-b bg-emerald-50/20">
                <CardTitle className="text-sm font-bold text-emerald-800 uppercase tracking-wider">
                  Nội dung lý thuyết (Explanation)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Văn bản lý thuyết *
                  </label>
                  <textarea
                    placeholder="Nhập nội dung bài học lý thuyết hoặc giải thích ngữ pháp..."
                    className="w-full p-3 border rounded-lg text-sm bg-background font-mono"
                    rows={10}
                    value={explanationBody}
                    onChange={(e) => setExplanationBody(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Hỗ trợ định dạng văn bản thô.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {type === "vocabulary_card" && (
            <Card className="border-blue-100">
              <CardHeader className="pb-3 border-b bg-blue-50/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-blue-800 uppercase tracking-wider">
                  Danh sách từ vựng (Vocabulary Entries)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addVocabEntry} className="text-xs">
                  <Plus className="size-3.5 mr-1" /> Thêm từ
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 divide-y divide-dashed">
                {vocabEntries.map((entry, index) => (
                  <div key={index} className="pt-4 first:pt-0 space-y-3 relative group">
                    {vocabEntries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeVocabEntry(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Lexeme ID *
                        </label>
                        <Input
                          placeholder="en-hello"
                          value={entry.lexemeId}
                          onChange={(e) => updateVocabEntry(index, { lexemeId: e.target.value })}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Từ vựng (Term) *
                        </label>
                        <Input
                          placeholder="Hello"
                          value={entry.term}
                          onChange={(e) => updateVocabEntry(index, { term: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Ý nghĩa tiếng Việt *
                        </label>
                        <Input
                          placeholder="Xin chào"
                          value={entry.meaningVi}
                          onChange={(e) => updateVocabEntry(index, { meaningVi: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Phiên âm (Pronunciation)
                        </label>
                        <Input
                          placeholder="/həˈloʊ/"
                          value={entry.pronunciation || ""}
                          onChange={(e) => updateVocabEntry(index, { pronunciation: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Ví dụ minh họa (Example)
                        </label>
                        <Input
                          placeholder="Hello, how are you?"
                          value={entry.example || ""}
                          onChange={(e) => updateVocabEntry(index, { example: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {type === "single_choice" && (
            <Card className="border-indigo-100">
              <CardHeader className="pb-3 border-b bg-indigo-50/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-indigo-800 uppercase tracking-wider">
                  Các lựa chọn trắc nghiệm (Options)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addOption} className="text-xs">
                  <Plus className="size-3.5 mr-1" /> Thêm lựa chọn
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {options.map((opt, index) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0 w-12">
                      {opt.id}
                    </span>
                    <Input
                      placeholder={`Lựa chọn ${index + 1}`}
                      value={opt.text}
                      onChange={(e) => updateOptionText(index, e.target.value)}
                    />
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctOptionId === opt.id}
                      onChange={() => setCorrectOptionId(opt.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground shrink-0">Đúng</span>
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 shrink-0"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {type === "listening_choice" && (
            <Card className="border-violet-100">
              <CardHeader className="pb-3 border-b bg-violet-50/20">
                <CardTitle className="text-sm font-bold text-violet-800 uppercase tracking-wider">
                  Cấu hình Nghe và chọn (Listening Choice)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Audio Media ID *
                    </label>
                    <Input
                      placeholder="Ví dụ: media-audio-l1"
                      value={listeningAudioId}
                      onChange={(e) => setListeningAudioId(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Transcript (Văn bản đọc) *
                    </label>
                    <Input
                      placeholder="Transcript nội dung âm thanh..."
                      value={listeningTranscript}
                      onChange={(e) => setListeningTranscript(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Lựa chọn trắc nghiệm</h4>
                    <Button variant="outline" size="sm" onClick={addOption} className="text-xs">
                      <Plus className="size-3.5 mr-1" /> Thêm
                    </Button>
                  </div>
                  {options.map((opt, index) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0 w-12">
                        {opt.id}
                      </span>
                      <Input
                        placeholder={`Lựa chọn ${index + 1}`}
                        value={opt.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                      />
                      <input
                        type="radio"
                        name="correct-option-listening"
                        checked={correctOptionId === opt.id}
                        onChange={() => setCorrectOptionId(opt.id)}
                        className="size-4 accent-primary"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">Đúng</span>
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 shrink-0"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {type === "gap_fill" && (
            <Card className="border-amber-100">
              <CardHeader className="pb-3 border-b bg-amber-50/20">
                <CardTitle className="text-sm font-bold text-amber-800 uppercase tracking-wider">
                  Cấu hình điền vào chỗ trống (Gap Fill)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Template chỗ trống (Template) *
                  </label>
                  <Input
                    placeholder="Ví dụ: My name is [gap-1]. I am [gap-2] years old."
                    value={gapTemplate}
                    onChange={(e) => setGapTemplate(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Sử dụng định dạng [gap-1], [gap-2] tương ứng với các ID ở bên dưới.
                  </p>
                </div>

                <div className="space-y-4 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Danh sách các khoảng trống (Gaps)</h4>
                    <Button variant="outline" size="sm" onClick={addGap} className="text-xs">
                      <Plus className="size-3.5 mr-1" /> Thêm Gap
                    </Button>
                  </div>

                  {gaps.map((gap, index) => {
                    const ans = gapAnswers.find((a) => a.gapId === gap.id) || {};
                    return (
                      <div key={gap.id} className="p-3 bg-muted/20 border rounded-xl space-y-3 relative">
                        {gaps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 text-red-500 hover:text-red-700"
                            onClick={() => removeGap(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">ID khoảng trống</label>
                            <Input value={gap.id} readOnly disabled className="font-mono text-xs bg-muted" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Gợi ý hiển thị (Placeholder)</label>
                            <Input
                              placeholder="..."
                              value={gap.placeholder}
                              onChange={(e) => updateGapPlaceholder(index, e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Đáp án chấp nhận (Cách nhau bằng dấu phẩy) *
                          </label>
                          <Input
                            placeholder="Ví dụ: John, Jon, Johnny"
                            value={ans.acceptedAnswers?.join(", ") || ""}
                            onChange={(e) => {
                              const list = e.target.value.split(",").map((s) => s.trim());
                              updateGapAnswerField(gap.id, { acceptedAnswers: list });
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ans.caseSensitive || false}
                              onChange={(e) => updateGapAnswerField(gap.id, { caseSensitive: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                            />
                            <span>Phân biệt Hoa/thường</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ans.kanaEquivalence || false}
                              onChange={(e) => updateGapAnswerField(gap.id, { kanaEquivalence: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                            />
                            <span>Chấp nhận Kana/Kanji (Nhật)</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ans.traditionalEquivalence || false}
                              onChange={(e) => updateGapAnswerField(gap.id, { traditionalEquivalence: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                            />
                            <span>Chấp nhận Giản thể/Phồn thể (Trung)</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {type === "reorder_tokens" && (
            <Card className="border-pink-100">
              <CardHeader className="pb-3 border-b bg-pink-50/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-pink-800 uppercase tracking-wider">
                  Cấu hình sắp xếp tokens (Reorder Tokens)
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addToken} className="text-xs">
                  <Plus className="size-3.5 mr-1" /> Thêm Token
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Định nghĩa các token (từ, cụm từ) được cắt rời và thứ tự ghép thành câu đúng bên dưới.
                </p>

                {tokens.map((tok, index) => (
                  <div key={tok.id} className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0 w-12">
                      {tok.id}
                    </span>
                    <Input
                      placeholder={`Nội dung từ/token ${index + 1}`}
                      value={tok.text}
                      onChange={(e) => updateTokenText(index, e.target.value)}
                    />
                    {tokens.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 shrink-0"
                        onClick={() => removeToken(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="pt-3 border-t space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase block">
                    Thứ tự ghép đúng (Ngăn cách bằng dấu phẩy) *
                  </label>
                  <Input
                    placeholder="Ví dụ: tok-1, tok-2, tok-3"
                    value={correctTokenIds.join(", ")}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setCorrectTokenIds(list);
                    }}
                    className="font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Danh sách các token ghép đúng theo thứ tự từ trái qua phải.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel: Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Cấu hình phân loại
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Kỹ năng (Skill)</label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  <option value="reading">Reading (Đọc hiểu)</option>
                  <option value="listening">Listening (Nghe hiểu)</option>
                  <option value="speaking">Speaking (Phát âm)</option>
                  <option value="grammar">Grammar (Ngữ pháp)</option>
                  <option value="vocabulary">Vocabulary (Từ vựng)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Độ khó (Difficulty)</label>
                <select
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border bg-background"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="a1">A1</option>
                  <option value="a2">A2</option>
                  <option value="b1">B1</option>
                  <option value="b2">B2</option>
                  <option value="c1">C1</option>
                  <option value="c2">C2</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Thời gian ước tính (Giây)</label>
                <Input
                  type="number"
                  value={estimatedSeconds}
                  onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="required-checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                />
                <label htmlFor="required-checkbox" className="font-semibold cursor-pointer">
                  Bắt buộc hoàn thành (Required)
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Link className="size-4" /> Nguồn tham khảo *
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {availableSources.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Chưa có nguồn tham khảo nào đăng ký.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableSources.map((src) => (
                    <label key={src.id} className="flex items-start gap-2 text-xs cursor-pointer p-1.5 hover:bg-muted/50 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(src.id)}
                        onChange={() => handleSourceToggle(src.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{src.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{src.id}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
