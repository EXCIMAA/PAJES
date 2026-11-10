import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const languages = Object.keys(i18n.options.resources ?? {});
  const currentLang =
    i18n.resolvedLanguage?.split("-")[0] ?? languages[0] ?? "fr";

  const toggleLanguage = () => {
    if (languages.length < 2) return;
    const currentIndex = languages.indexOf(currentLang);
    const nextLang = languages[(currentIndex + 1) % languages.length];
    if (!nextLang) return;
    i18n.changeLanguage(nextLang);
    localStorage.setItem("preferredLanguage", nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-700/10 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500 dark:text-slate-300 dark:hover:bg-slate-700/40 dark:hover:text-slate-100 max-[380px]:gap-1.5 max-[380px]:px-2"
      aria-label={t("language.switch")}
      type="button"
    >
      <Globe className="h-4 w-4" />
      <span className="uppercase">{currentLang}</span>
    </button>
  );
}
