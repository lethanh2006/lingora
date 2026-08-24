type VocabularyLanguageCode = "en" | "ja" | "zh";

let activeAudio: HTMLAudioElement | null = null;

function speechLanguage(languageCode: VocabularyLanguageCode) {
  if (languageCode === "ja") return "ja-JP";
  if (languageCode === "zh") return "zh-CN";
  return "en-US";
}

function speakWithBrowser(text: string, languageCode: VocabularyLanguageCode) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLanguage(languageCode);
  window.speechSynthesis.speak(utterance);
}

export async function playPronunciation({
  text,
  languageCode,
  audioUrl,
}: {
  text: string;
  languageCode: VocabularyLanguageCode;
  audioUrl?: string | null;
}) {
  activeAudio?.pause();
  activeAudio = null;
  window.speechSynthesis?.cancel();

  if (!audioUrl || typeof Audio === "undefined") {
    speakWithBrowser(text, languageCode);
    return;
  }

  let usedFallback = false;
  const fallback = () => {
    if (usedFallback) return;
    usedFallback = true;
    speakWithBrowser(text, languageCode);
  };

  try {
    const audio = new Audio(audioUrl);
    activeAudio = audio;
    audio.addEventListener("ended", () => {
      if (activeAudio === audio) activeAudio = null;
    }, { once: true });
    audio.addEventListener("error", fallback, { once: true });
    await audio.play();
  } catch {
    fallback();
  }
}
