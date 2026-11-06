import React, { Component, lazy as reactLazy } from "react";

type Importer<T extends React.ComponentType<any>> = () => Promise<{ default: T }>;

const describeError = (error: unknown): string => error instanceof Error ? error.message : String(error);
const loggedErrors = new WeakSet<object>();
const moduleNameFrom = (importer: Function): string => {
  const match = importer.toString().match(/import\(([^)]+)\)/);
  return match?.[1]?.replace(/["']/g, "") || "unknown-route-module";
};

const logRouteLoadFailure = (moduleName: string, error: unknown, retryAttempted: boolean) => {
  if (typeof error === "object" && error !== null) {
    if (loggedErrors.has(error)) return;
    loggedErrors.add(error);
  }
  console.error("[route-load] Dynamic route module failed", {
    route: window.location.pathname,
    module: moduleName,
    message: describeError(error),
    category: /dynamically imported|failed to fetch|importing a module/i.test(describeError(error)) ? "module-load" : "module-evaluation",
    timestamp: new Date().toISOString(),
    retryAttempted,
  }, error);
};

export function lazyWithRetry<T extends React.ComponentType<any>>(importer: Importer<T>) {
  const moduleName = moduleNameFrom(importer);
  return reactLazy(async () => {
    try {
      return await importer();
    } catch (firstError) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      try {
        return await importer();
      } catch (secondError) {
        logRouteLoadFailure(moduleName, secondError, true);
        throw secondError || firstError;
      }
    }
  });
}

type BoundaryProps = { children: React.ReactNode };
type BoundaryState = { error: Error | null };

export class RouteLoadBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    logRouteLoadFailure("react-route", error, false);
  }

  retry = () => {
    const key = `crm-route-retry:${window.location.pathname}`;
    const lastRetry = Number(window.sessionStorage.getItem(key) || 0);
    if (Date.now() - lastRetry > 30_000) {
      window.sessionStorage.setItem(key, String(Date.now()));
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[280px] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">This page could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-600">Please try again. If the problem continues, refresh the page or contact support.</p>
          <button type="button" onClick={this.retry} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Try again
          </button>
        </div>
      </div>
    );
  }
}
