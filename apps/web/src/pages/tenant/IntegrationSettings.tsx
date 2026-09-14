import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { clsx } from "@/lib/clsx";
import {
  getIntegrationStatus,
  saveApiKey,
  testApiKey,
  disconnectApiKey,
  type IntegrationStatus,
} from "@/lib/reportingNinja";

export default function IntegrationSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");

  const STATUS_STYLES: Record<IntegrationStatus, string> = {
    NOT_CONNECTED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    CONNECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    INVALID: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const STATUS_LABELS: Record<IntegrationStatus, string> = {
    NOT_CONNECTED: t("settings.statusNotConnected"),
    PENDING: t("settings.statusPending"),
    CONNECTED: t("settings.statusConnected"),
    INVALID: t("settings.statusInvalid"),
  };

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
            <h2 className="text-base font-semibold">{t("settings.reportingNinjaTitle")}</h2>
            <p className="text-sm text-slate-500">{t("settings.reportingNinjaSubtitle")}</p>
          </div>
          {!isLoading && (
            <span className={clsx("rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
              {STATUS_LABELS[status]}
            </span>
          )}
        </div>

        {integration?.keyPreview && (
          <p className="mt-4 text-sm text-slate-500">
            {t("settings.currentKey")}: <span className="font-mono">{integration.keyPreview}</span>
            {integration.lastTestedAt && (
              <> · {t("settings.lastTested")} {new Date(integration.lastTestedAt).toLocaleString()}</>
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
          <div className="flex-1">
            <PasswordInput
              placeholder={t("settings.keyPlaceholder")}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saveMutation.isPending || !apiKey.trim()}>
            {saveMutation.isPending ? t("settings.savingAndTesting") : t("settings.saveAndTest")}
          </Button>
        </form>

        {errorMessage && <p className="mt-2 text-sm text-red-500">{errorMessage}</p>}
        {saveMutation.isSuccess && status === "CONNECTED" && (
          <p className="mt-2 text-sm text-emerald-500">{t("settings.connectedSuccess")}</p>
        )}

        {status !== "NOT_CONNECTED" && (
          <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              {testMutation.isPending ? t("settings.retesting") : t("settings.retest")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {t("settings.disconnect")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
