"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  BookOpen,
  Globe,
  Tag,
  Save,
  XCircle,
  CheckCircle2,
  X,
  FileText
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SourceAttribution = {
  id: string;
  title: string;
  publisher: string;
  canonicalUrl: string;
  licenseCode: string;
  licenseUrl: string;
  attributionText: string;
};

type SourceManagerProps = {
  initialSources: SourceAttribution[];
};

export function SourceManager({ initialSources }: SourceManagerProps) {
  const [sources, setSources] = useState<SourceAttribution[]>(initialSources);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [licenseCode, setLicenseCode] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [attributionText, setAttributionText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setId("");
    setTitle("");
    setPublisher("");
    setCanonicalUrl("");
    setLicenseCode("");
    setLicenseUrl("");
    setAttributionText("");
    setError(null);
    setSuccess(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setEditId(null);
    setIsEditing(true);
  };

  const handleStartEdit = (src: SourceAttribution) => {
    setId(src.id);
    setTitle(src.title);
    setPublisher(src.publisher);
    setCanonicalUrl(src.canonicalUrl);
    setLicenseCode(src.licenseCode);
    setLicenseUrl(src.licenseUrl);
    setAttributionText(src.attributionText);
    setEditId(src.id);
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditId(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    // Simple url checks
    try {
      new URL(canonicalUrl);
      new URL(licenseUrl);
    } catch {
      setError("Canonical URL và License URL phải là đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://)");
      setIsSubmitting(false);
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      setError("ID nguồn không hợp lệ. Chỉ chấp nhận chữ cái, số, gạch ngang, gạch dưới.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      id,
      title,
      publisher,
      canonicalUrl,
      licenseCode,
      licenseUrl,
      attributionText,
    };

    const isNew = editId === null;
    const url = isNew ? "/api/admin/sources" : `/api/admin/sources/${editId}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi lưu nguồn tham khảo");
      }

      setSuccess(isNew ? "Thêm nguồn tham khảo mới thành công!" : "Cập nhật nguồn tham khảo thành công!");

      if (isNew) {
        setSources((prev) => [...prev, data.source]);
      } else {
        setSources((prev) => prev.map((s) => (s.id === editId ? data.source : s)));
      }

      setTimeout(() => {
        setIsEditing(false);
        resetForm();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nguồn "${sourceId}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gặp lỗi khi xóa nguồn tham khảo");
      }

      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (err: any) {
      alert(err.message || "Lỗi khi xóa");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action panel */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Nguồn tham khảo (Content Sources)</h2>
        {!isEditing && (
          <Button onClick={handleStartCreate} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="size-4" />
            Thêm nguồn mới
          </Button>
        )}
      </div>

      {isEditing && (
        <Card className="border-2 border-primary/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-primary">
                {editId ? `Chỉnh sửa nguồn: ${editId}` : "Tạo nguồn tham khảo mới"}
              </CardTitle>
              <CardDescription>
                Khai báo thông tin bản quyền và nhà xuất bản cho học liệu.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    ID Nguồn *
                  </label>
                  <Input
                    placeholder="Ví dụ: oxford-dict"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    disabled={!!editId}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Chỉ chữ cái, số, gạch nối, gạch dưới. Không thể sửa sau khi tạo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Tiêu đề nguồn *
                  </label>
                  <Input
                    placeholder="Ví dụ: Oxford Advanced Learner's Dictionary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Nhà xuất bản *
                  </label>
                  <Input
                    placeholder="Ví dụ: Oxford University Press"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Mã bản quyền / License Code *
                  </label>
                  <Input
                    placeholder="Ví dụ: CC-BY-4.0, Proprietary"
                    value={licenseCode}
                    onChange={(e) => setLicenseCode(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Canonical URL *
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.oxfordlearnersdictionaries.com"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    License URL *
                  </label>
                  <Input
                    type="url"
                    placeholder="https://creativecommons.org/licenses/by/4.0/"
                    value={licenseUrl}
                    onChange={(e) => setLicenseUrl(e.target.value)}
                    required
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Văn bản ghi nhận / Attribution Text *
                </label>
                <textarea
                  placeholder="Nhập nội dung hiển thị ghi nhận bản quyền đầy đủ..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={attributionText}
                  onChange={(e) => setAttributionText(e.target.value)}
                  required
                />
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

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5">
                  <Save className="size-4" />
                  {isSubmitting ? "Đang lưu..." : "Lưu nguồn"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grid of Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map((src) => (
          <Card key={src.id} className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <CardHeader className="pb-2 border-b bg-muted/10">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary shrink-0" />
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {src.id}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold line-clamp-1">
                    {src.title}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => handleStartEdit(src)}>
                    <Edit3 className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(src.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Nhà xuất bản:</span>
                  <span className="font-semibold text-foreground">{src.publisher}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Bản quyền:</span>
                  <span className="font-mono text-foreground font-bold">{src.licenseCode}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/30 italic text-muted-foreground">
                "{src.attributionText}"
              </div>

              <div className="flex justify-between items-center pt-2 border-t text-[11px]">
                <a
                  href={src.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="size-3" />
                  Trang chủ
                  <ExternalLink className="size-2.5" />
                </a>
                <a
                  href={src.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                >
                  <FileText className="size-3" />
                  Giấy phép
                  <ExternalLink className="size-2.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
