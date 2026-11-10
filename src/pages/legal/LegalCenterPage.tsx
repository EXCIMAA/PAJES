import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Printer,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../components/ui/LanguageSwitcher";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { legalDocumentsEn } from "./content.en";
import { legalDocumentsFr } from "./content.fr";
import type { LegalDocumentId, LegalDocuments } from "./contentTypes";

const documentsByLanguage: Record<string, LegalDocuments> = {
  en: legalDocumentsEn,
  fr: legalDocumentsFr,
};

export function LegalCenterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDocument = searchParams.get("document");
  const activeDocument: LegalDocumentId =
    requestedDocument === "privacy" ? "privacy" : "terms";
  const language = i18n.resolvedLanguage?.split("-")[0] ?? "fr";
  const documents = documentsByLanguage[language];
  const content = documents?.[activeDocument];
  const [activeSection, setActiveSection] = useState(
    content?.sections[0]?.id ?? "",
  );
  const previousDocument = useRef(activeDocument);

  useEffect(() => {
    if (previousDocument.current !== activeDocument) {
      previousDocument.current = activeDocument;
      setActiveSection(content?.sections[0]?.id ?? "");
      return;
    }

    setActiveSection((currentSection) =>
      content?.sections.some((section) => section.id === currentSection)
        ? currentSection
        : (content?.sections[0]?.id ?? ""),
    );
  }, [activeDocument, content]);

  useEffect(() => {
    if (!content) return;

    const sections = Array.from(
      window.document.querySelectorAll<HTMLElement>(".legal-section"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const currentSection = visibleSections[0]?.target.id;
        if (currentSection) setActiveSection(currentSection);
      },
      { rootMargin: "-12% 0px -72% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [content]);

  const metadata = useMemo(
    () => [
      { label: t("legalCenter.version"), value: content?.version ?? "" },
      {
        label: t("legalCenter.effectiveDate"),
        value: t("legalCenter.notEffective"),
      },
      {
        label: t("legalCenter.lastUpdated"),
        value: t("legalCenter.notUpdated"),
      },
    ],
    [content, t],
  );

  function selectDocument(documentId: LegalDocumentId) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("document", documentId);
    setSearchParams(nextParams);
  }

  function navigateToSection(sectionId: string) {
    setActiveSection(sectionId);
    const section = window.document.getElementById(sectionId);
    section?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    section?.querySelector("h3")?.focus({ preventScroll: true });
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/login");
  }

  return (
    <div className="legal-page min-h-screen bg-app text-app-primary">
      <header className="legal-header border-b border-app bg-app-secondary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide">
                PAJES
              </p>
              <p className="truncate text-xs text-app-tertiary">
                {t("legalCenter.eyebrow")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="btn-ghost btn-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("legalCenter.back")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-secondary btn-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={t("legalCenter.printLabel")}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t("legalCenter.print")}
          </button>
        </div>

        <section className="mb-8 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
            {t("legalCenter.eyebrow")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-app-primary sm:text-4xl">
            {t("legalCenter.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-app-secondary">
            {t("legalCenter.intro")}
          </p>
        </section>

        <section
          className="legal-draft-notice mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
          aria-labelledby="legal-draft-title"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
              aria-hidden="true"
            />
            <div>
              <h2
                id="legal-draft-title"
                className="text-sm font-semibold text-app-primary"
              >
                {t("legalCenter.draftTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-app-secondary">
                {t("legalCenter.draftNotice")}
              </p>
            </div>
          </div>
        </section>

        <div
          className="mb-6 grid gap-3 sm:grid-cols-2"
          role="tablist"
          aria-label={t("legalCenter.documentNavigation")}
        >
          {(["terms", "privacy"] as const).map((documentId) => {
            const isSelected = activeDocument === documentId;
            const Icon = documentId === "terms" ? FileText : ShieldCheck;
            return (
              <button
                key={documentId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="legal-document-panel"
                onClick={() => selectDocument(documentId)}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    event.key !== "ArrowLeft" &&
                    event.key !== "ArrowRight" &&
                    event.key !== "Home" &&
                    event.key !== "End"
                  ) {
                    return;
                  }
                  event.preventDefault();
                  const tabs = Array.from(
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                      '[role="tab"]',
                    ) ?? [],
                  );
                  const selectedIndex = tabs.findIndex((tab) => tab === event.currentTarget);
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : (selectedIndex + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                          tabs.length;
                  const nextTab = tabs[nextIndex];
                  nextTab?.focus();
                  if (nextTab) {
                    selectDocument(nextIndex === 0 ? "terms" : "privacy");
                  }
                }}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isSelected
                    ? "border-primary-500/50 bg-primary-600/10 text-primary-700 dark:text-primary-200"
                    : "border-app bg-app-secondary text-app-secondary hover:border-app-light hover:bg-app-tertiary"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {t(
                  documentId === "terms"
                    ? "legalCenter.termsTab"
                    : "legalCenter.privacyTab",
                )}
              </button>
            );
          })}
        </div>

        {!content ? (
          <section
            className="card rounded-xl p-6"
            role="status"
            aria-live="polite"
          >
            <h2 className="text-lg font-semibold">{t("legalCenter.unavailableTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-app-secondary">
              {t("legalCenter.unavailableBody")}
            </p>
          </section>
        ) : (
          <div
            id="legal-document-panel"
            role="tabpanel"
            className="legal-document-layout"
          >
            <aside className="legal-toc-column">
              <details className="legal-mobile-toc card rounded-xl p-4">
                <summary className="cursor-pointer text-sm font-semibold text-app-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  {t("legalCenter.tableOfContents")}
                </summary>
                <Toc
                  sections={content.sections}
                  activeSection={activeSection}
                  onSelect={navigateToSection}
                  label={t("legalCenter.sectionNavigation")}
                />
              </details>
              <div className="legal-desktop-toc card rounded-xl p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-tertiary">
                  {t("legalCenter.tableOfContents")}
                </h2>
                <Toc
                  sections={content.sections}
                  activeSection={activeSection}
                  onSelect={navigateToSection}
                  label={t("legalCenter.sectionNavigation")}
                />
              </div>
            </aside>

            <article className="legal-document card min-w-0 rounded-xl p-5 sm:p-8">
              <header className="legal-document-heading border-b border-app pb-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-app-tertiary">
                  {t("legalCenter.documentLabel")} · {content.version}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-app-primary">
                  {content.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-app-secondary">
                  {content.summary}
                </p>
                <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  {t("legalCenter.awaitingReview")}
                </p>
                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  {metadata.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg bg-app-tertiary px-3 py-2.5"
                    >
                      <dt className="text-xs text-app-tertiary">{label}</dt>
                      <dd className="mt-1 text-xs font-medium leading-5 text-app-primary">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </header>

              <div className="legal-sections">
                {content.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="legal-section scroll-mt-6 border-b border-app py-6 last:border-b-0"
                    aria-labelledby={`${section.id}-heading`}
                  >
                    <h3
                      id={`${section.id}-heading`}
                      tabIndex={-1}
                      className="text-base font-semibold leading-6 text-app-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      {section.title}
                    </h3>
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-3 text-sm leading-7 text-app-secondary"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-app-secondary">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              <footer className="legal-print-footer mt-6 border-t border-app pt-4 text-xs text-app-tertiary">
                {t("legalCenter.printFooter")}
              </footer>
            </article>
          </div>
        )}

        <section className="card mt-8 rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-app-primary">
            {t("legalCenter.contactTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-app-secondary">
            {t("legalCenter.contactBody")}
          </p>
          <p className="mt-3 text-sm font-medium text-app-primary">
            {t("legalCenter.contactPlaceholder")}
          </p>
        </section>

        <footer className="legal-footer mt-8 flex flex-col gap-3 border-t border-app py-5 text-xs text-app-tertiary sm:flex-row sm:items-center sm:justify-between">
          <span>PAJES · EXCI-MAA</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => selectDocument("terms")}
              className="rounded underline-offset-4 hover:text-app-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {t("legalCenter.termsTab")}
            </button>
            <button
              type="button"
              onClick={() => selectDocument("privacy")}
              className="rounded underline-offset-4 hover:text-app-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {t("legalCenter.privacyTab")}
            </button>
          </div>
          <a
            href="/login"
            className="rounded underline-offset-4 hover:text-app-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {t("legalCenter.backToSignIn")}
          </a>
        </footer>
      </main>
    </div>
  );
}

function Toc({
  sections,
  activeSection,
  onSelect,
  label,
}: {
  sections: LegalDocuments[LegalDocumentId]["sections"];
  activeSection: string;
  onSelect: (sectionId: string) => void;
  label: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              aria-current={activeSection === section.id ? "location" : undefined}
              className={`w-full rounded-md border-l-2 px-3 py-2 text-left text-xs leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeSection === section.id
                  ? "border-primary-500 bg-primary-600/10 font-medium text-primary-700 dark:text-primary-200"
                  : "border-transparent text-app-secondary hover:bg-app-tertiary hover:text-app-primary"
              }`}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
