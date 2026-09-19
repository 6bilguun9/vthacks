"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getHealth } from "@/lib/api";

type Connection =
  | { state: "checking" }
  | { state: "connected" }
  | { state: "unavailable"; message: string };

export function ApiStatus() {
  const [connection, setConnection] = useState<Connection>({ state: "checking" });
  const activeRequest = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    activeRequest.current?.abort();
    const request = new AbortController();
    activeRequest.current = request;
    setConnection({ state: "checking" });
    try {
      await getHealth({ signal: request.signal });
      if (!request.signal.aborted) setConnection({ state: "connected" });
    } catch (error) {
      if (!request.signal.aborted) {
        setConnection({ state: "unavailable", message: error instanceof ApiError ? error.message : "The connection could not be checked." });
      }
    }
  }, []);

  useEffect(() => {
    // Schedule external synchronization so the first server/client render stays identical.
    const timer = window.setTimeout(() => { void check(); }, 0);
    return () => {
      window.clearTimeout(timer);
      activeRequest.current?.abort();
    };
  }, [check]);

  const connected = connection.state === "connected";
  const checking = connection.state === "checking";

  return (
    <Card className="shadow-[0_12px_48px_-32px_rgba(50,25,35,0.4)]">
      <CardHeader>
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace connection</span>
          <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${connected ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
            {checking ? <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : connected ? <Check className="size-5" aria-hidden="true" /> : <Unplug className="size-4" aria-hidden="true" />}
          </span>
          <CardTitle>{checking ? "Checking the API…" : connected ? "Frontend meets backend." : "Backend is unavailable."}</CardTitle>
        </div>
        <CardDescription className="mt-2 min-h-12">
          {connection.state === "unavailable" ? connection.message : connected ? "The health check passed. Your two workspaces can communicate over the v1 API." : "Making a real request to the backend health endpoint."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-xl bg-muted/70 px-4 py-3 font-mono text-xs text-muted-foreground">
          GET /api/v1/health
        </div>
        <Button variant="outline" onClick={() => { void check(); }} disabled={checking}>
          <RefreshCw aria-hidden="true" /> Check connection
        </Button>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">This checks the API server only. Banking, savings calculations, and AI integrations are not connected yet.</p>
      </CardContent>
    </Card>
  );
}
