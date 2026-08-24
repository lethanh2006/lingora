"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

type ImportSummary = {
  total: number;
  created: number;
  updated: number;
};

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : "Không thể xử lý tệp CSV";
}

async function sendImport(endpoint: string, file: File, mode: "preview" | "apply") {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("mode", mode);
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (!response.ok) throw new Error(await responseError(response));
  const body = await response.json() as { summary: ImportSummary };
  return body.summary;
}

export function VocabularyTransferActions({
  endpoint,
  itemLabel,
}: {
  endpoint: string;
  itemLabel: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const preview = await sendImport(endpoint, file, "preview");
      const confirmed = window.confirm(
        `Tệp có ${preview.total} ${itemLabel}: ${preview.created} tạo mới, ${preview.updated} cập nhật. Không có dữ liệu nào bị xóa. Tiếp tục import?`,
      );
      if (!confirmed) return;
      const result = await sendImport(endpoint, file, "apply");
      setNotice(
        `Đã import ${result.total} ${itemLabel}: ${result.created} tạo mới, ${result.updated} cập nhật.`,
      );
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể import CSV");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={endpoint} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Download className="size-4" /> Xuất CSV
      </a>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => fileInput.current?.click()}
        disabled={pending}
      >
        <Upload className="size-4" /> {pending ? "Đang kiểm tra..." : "Nhập CSV"}
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={importFile}
        aria-label={`Chọn tệp CSV để import ${itemLabel}`}
      />
      {error && <p role="alert" className="basis-full text-xs font-medium text-destructive">{error}</p>}
      {notice && <p role="status" className="basis-full text-xs font-medium text-emerald-700">{notice}</p>}
    </div>
  );
}
