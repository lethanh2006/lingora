import Link from "next/link";
import { ArrowRight, Gamepad2, WholeWord } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  TopicProgressDto,
  VocabularyTopicDto,
} from "@/features/vocabulary/schemas/vocabulary.schema";
import { getVocabularyLanguageCopy } from "@/features/vocabulary/vocabulary-language";

const accentClasses = {
  emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20",
  blue: "from-blue-500/15 to-blue-500/5 border-blue-500/20",
  violet: "from-violet-500/15 to-violet-500/5 border-violet-500/20",
  amber: "from-amber-500/15 to-amber-500/5 border-amber-500/20",
  rose: "from-rose-500/15 to-rose-500/5 border-rose-500/20",
  cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/20",
} as const;

export function TopicCard({
  topic,
  progress,
}: {
  topic: VocabularyTopicDto;
  progress?: TopicProgressDto;
}) {
  const masteredCount = Math.min(progress?.masteredWordIds.length ?? 0, topic.wordCount);
  const percent = topic.wordCount > 0 ? Math.round((masteredCount / topic.wordCount) * 100) : 0;
  const languageCopy = getVocabularyLanguageCopy(topic.languageCode);

  return (
    <Link href={`/learn/${topic.id}`} className="group block h-full">
      <Card className={`h-full overflow-hidden bg-gradient-to-br transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${accentClasses[topic.accent]}`}>
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-background/85 text-3xl shadow-sm" aria-hidden="true">{topic.icon}</span>
            <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">{languageCopy.name}</span>
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight">{topic.title}</h2>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">{topic.description}</p>
          <div className="mt-5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><WholeWord className="size-4" /> {topic.wordCount} từ</span>
            <span className="flex items-center gap-1.5"><Gamepad2 className="size-4" /> {progress?.practicedModes.length ?? 0}/3 trò đã luyện</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/80">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Đã thuộc {masteredCount}/{topic.wordCount}</span>
            <span className="flex items-center gap-1 font-bold text-primary">{progress ? "Học tiếp" : "Bắt đầu"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
