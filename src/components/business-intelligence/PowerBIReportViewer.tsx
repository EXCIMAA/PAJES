import { useEffect, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import { PowerBIEmbed, type EventHandler } from "powerbi-client-react";
import {
  models,
  type IReportEmbedConfiguration,
  type Report,
} from "powerbi-client";
import {
  businessIntelligenceApi,
  type BIReportMetadata,
} from "../../api/businessIntelligence";

interface PowerBIReportViewerProps {
  reportId: string;
}

export function PowerBIReportViewer({ reportId }: PowerBIReportViewerProps) {
  const reportRef = useRef<Report | null>(null);
  const [configuration, setConfiguration] =
    useState<IReportEmbedConfiguration | null>(null);
  const [report, setReport] = useState<BIReportMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setConfiguration(null);

    void Promise.all([
      businessIntelligenceApi.getReportMetadata(reportId),
      businessIntelligenceApi.getEmbedToken(reportId),
    ])
      .then(([metadata, token]) => {
        if (!active) return;
        setReport(metadata);
        setConfiguration({
          type: "report",
          id: metadata.id,
          embedUrl: token.embed_url,
          accessToken: token.embed_token,
          tokenType: models.TokenType.Embed,
          settings: {
            panes: {
              filters: { visible: true, expanded: false },
              pageNavigation: { visible: true },
            },
            background: models.BackgroundType.Transparent,
          },
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load Power BI report.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      reportRef.current = null;
    };
  }, [reportId]);

  const clearFilters = async () => {
    if (!reportRef.current) return;
    try {
      await reportRef.current.removeFilters();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to clear report filters.");
    }
  };

  const fullscreen = () => {
    reportRef.current?.fullscreen();
  };
  const handleEmbedError: EventHandler = (event) => {
    const detail = event?.detail as { message?: string } | undefined;
    setError(detail?.message || "The Power BI report encountered an error.");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-app bg-app-secondary">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app px-4 py-3">
        <div>
          <h3 className="font-semibold text-app-primary">
            {report?.name || "Power BI report"}
          </h3>
          <p className="text-xs text-app-tertiary">
            Interactive report · secured short-lived embed token
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-secondary hover:bg-app-tertiary disabled:opacity-50"
            onClick={() => void clearFilters()}
            disabled={!configuration}
          >
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app-secondary hover:bg-app-tertiary disabled:opacity-50"
            onClick={fullscreen}
            disabled={!configuration}
          >
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </button>
        </div>
      </div>
      {loading && (
        <div className="flex h-[60vh] items-center justify-center text-sm text-app-secondary">
          Loading secure report…
        </div>
      )}
      {!loading && error && (
        <div className="m-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-500">
          {error}
        </div>
      )}
      {!loading && configuration && (
        <PowerBIEmbed
          embedConfig={configuration}
          cssClassName="h-[70vh] min-h-[420px] w-full"
          getEmbeddedComponent={(embedded) => {
            reportRef.current = embedded as Report;
          }}
          eventHandlers={
            new Map([
              ["loaded", () => setError(null)],
              ["error", handleEmbedError],
            ])
          }
        />
      )}
    </section>
  );
}
