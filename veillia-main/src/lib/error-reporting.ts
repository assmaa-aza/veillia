type ErrorReportingOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

/**
 * Reports an application error to the console and any configured
 * external monitoring service (e.g. Sentry) attached to window.__errorEvents.
 */
type ErrorEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReportingOptions,
  ) => void;
};

declare global {
  interface Window {
    __errorEvents?: ErrorEvents;
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("[VeillIA] Application error:", error, context);
  if (typeof window === "undefined") return;
  window.__errorEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
