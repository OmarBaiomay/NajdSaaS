import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/clsx";
import {
  getIntegrationStatus,
  saveApiKey,
  testApiKey,
  disconnectApiKey,
  type IntegrationStatus,
} from "@/lib/reportingNinja";

const STATUS_STYLES: Record<IntegrationStatus, string> = {
  NOT_CONNECTED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONNECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  INVALID: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function IntegrationSettings() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");

  const { data: integration, isLoading } = useQuery({
    queryKey: ["reporting-ninja-status"],
    queryFn: getIntegrationStatus,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reporting-ninja-status"] });

  const saveMutation = useMutation({
    mutationFn: saveApiKey,
    onSuccess: () => {
      setApiKey("");
      invalidate();
    },
  });

  const testMutation = useMutation({ mutationFn: testApiKey, onSuccess: invalidate });
  const disconnectMutation = useMutation({ mutationFn: disconnectApiKey, onSuccess: invalidate });

  const status = integration?.status ?? "NOT_CONNECTED";
  const error = saveMutation.error ?? testMutation.error;
  const errorMessage =
    (error as { response?: { data?: { error?: { message?: string } } } } | undefined)?.response?.data?.error
      ?.message;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Reporting Ninja</h2>
            <p className="text-sm text-slate-500">Connect your Reporting Ninja API key to pull data into this dashboard.</p>
          </div>
          {!isLoading && (
            <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
              {status === "NOT_CONNECTED" ? "Not connected" : status.charAt(0) + status.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {integration?.keyPreview && (
          <p className="mt-4 text-sm text-slate-500">
            Current key: <span className="font-mono">{integration.keyPreview}</span>
            {integration.lastTestedAt && (
              <> · last tested {new Date(integration.lastTestedAt).toLocaleString()}</>
            )}
          </p>
        )}

        {integration?.lastError && status === "INVALID" && (
          <p className="mt-2 text-sm text-red-500">{integration.lastError}</p>
        )}

        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (apiKey.trim()) saveMutation.mutate(apiKey);
          }}
        >
          <input
            type="password"
            placeholder="Paste your Reporting Ninja API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
          />
          <Button type="submit" disabled={saveMutation.isPending || !apiKey.trim()}>
            {saveMutation.isPending ? "Saving & testing…" : "Save & test"}
          </Button>
        </form>

        {errorMessage && <p className="mt-2 text-sm text-red-500">{errorMessage}</p>}
        {saveMutation.isSuccess && status === "CONNECTED" && (
          <p className="mt-2 text-sm text-emerald-500">Connected — data is ready on the Reports page.</p>
        )}

        {status !== "NOT_CONNECTED" && (
          <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              {testMutation.isPending ? "Testing…" : "Re-test connection"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              Disconnect
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
