"use client";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { playPronunciation } from "@/features/vocabulary/components/pronunciation-player";

export function SpeakButton({
  text,
  languageCode,
  audioUrl,
}: {
  text: string;
  languageCode: "en" | "ja" | "zh";
  audioUrl?: string | null;
}) {
  function speak() {
    void playPronunciation({ text, languageCode, audioUrl });
  }

  return <Button type="button" size="icon" variant="ghost" onClick={speak} aria-label={`Phát âm ${text}`}><Volume2 className="size-5" /></Button>;
}
