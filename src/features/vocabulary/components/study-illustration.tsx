import { Check, Sparkles, Sprout } from "lucide-react";

export function StudyIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative mx-auto w-full select-none ${compact ? "h-52 max-w-64" : "h-[360px] max-w-[420px] sm:h-[410px]"}`}
    >
      <div className="absolute inset-[7%] rounded-full border border-primary/10" />
      <div className="absolute inset-[17%] rounded-full bg-white/35" />
      <div className="absolute left-[16%] top-[16%] h-[66%] w-[64%] -rotate-[13deg] rounded-[22px] border border-[#d8dfbd] bg-[#d4dfb3]" />
      <div className="absolute left-[20%] top-[12%] flex h-[70%] w-[64%] rotate-[8deg] flex-col items-center justify-center rounded-[22px] border border-white/90 bg-[#fffef8] shadow-[0_18px_35px_#31452916]">
        {!compact && (
          <span className="absolute left-5 top-4 text-[9px] font-bold tracking-[0.18em] text-muted-foreground">
            MỖI NGÀY MỘT TỪ
          </span>
        )}
        <span
          className={
            compact ? "text-5xl text-primary" : "text-8xl text-primary"
          }
        >
          木
        </span>
        <span className="mt-2 text-xs text-muted-foreground">き · ki</span>
        <span className="mt-4 h-px w-10 bg-border" />
        <span className="mt-3 text-sm font-semibold">cây</span>
        <Sprout
          className="absolute bottom-4 right-4 size-7 text-primary/40"
          strokeWidth={1.3}
        />
      </div>
      <span className="absolute right-[7%] top-[8%] grid size-10 place-items-center rounded-xl bg-[#f1c96c] shadow-sm">
        <Sparkles className="size-5 text-[#775b27]" />
      </span>
      <span className="absolute bottom-[10%] left-[6%] flex -rotate-6 items-center gap-2 rounded-xl border border-white bg-white px-4 py-3 text-xs font-semibold shadow-[0_8px_24px_#3145290c]">
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary">
          <Check className="size-3.5" />
        </span>
        Thêm một từ, thêm tự tin.
      </span>
      <span className="absolute bottom-[12%] right-[5%] text-4xl">🌱</span>
    </div>
  );
}
