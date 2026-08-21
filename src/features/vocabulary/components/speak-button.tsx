"use client";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SpeakButton({ text, languageCode }: { text: string; languageCode: "en" | "ja" | "zh" }) {
  function speak() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode === "ja" ? "ja-JP" : languageCode === "zh" ? "zh-CN" : "en-US";
    window.speechSynthesis.speak(utterance);
  }

  return <Button type="button" size="icon" variant="ghost" onClick={speak} aria-label={`Phát âm ${text}`}><Volume2 className="size-5" /></Button>;
}
