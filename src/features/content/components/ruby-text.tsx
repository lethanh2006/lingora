import React from "react";

export function RubyText({ text, enabled, languageId }: { text: string; enabled: boolean; languageId: string }) {
  if (!text) return null;

  // Only parse brackets for Japanese (ja) and Chinese (zh)
  if (languageId !== "ja" && languageId !== "zh") {
    return <span>{text}</span>;
  }

  const regex = /([^\s[\]]+)\[([^[\]]+)\]/g;

  if (!enabled) {
    // Strip ruby brackets
    return <span>{text.replace(regex, "$1")}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const base = match[1];
    const ruby = match[2];

    parts.push(
      <ruby key={match.index} className="ruby-align">
        {base}
        <rt className="text-[0.55em] font-medium text-muted-foreground select-none pointer-events-none pb-0.5">{ruby}</rt>
      </ruby>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className="inline-flex flex-wrap items-baseline gap-x-0.5">{parts}</span>;
}
