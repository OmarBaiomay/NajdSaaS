import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { GlowCard } from "@/components/ui/GlowCard";
import { RevenueChart } from "@/components/charts/RevenueChart";
import {
  getIntegrationStatus,
  listIntegrations,
  listConnections,
  listFields,
  runQuery,
} from "@/lib/reportingNinja";

const ACCENTS = ["brand", "violet", "teal", "amber"] as const;

export default function Reports() {
  const { data: integration } = useQuery({ queryKey: ["reporting-ninja-status"], queryFn: getIntegrationStatus });
  const connected = integration?.status === "CONNECTED";

  const [integrationId, setIntegrationId] = useState<string>("");
  const [connectionKey, setConnectionKey] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);

  const { data: integrations } = useQuery({
    queryKey: ["rn-integrations"],
    queryFn: listIntegrations,
    enabled: connected,
  });

  const { data: connections } = useQuery({
    queryKey: ["rn-connections", integrationId],
    queryFn: () => listConnections(integrationId),
    enabled: connected && !!integrationId,
  });

  const accounts = connections?.flatMap((c) => c.accounts.map((a) => ({ ...a, connectionKey: c.connection_key }))) ?? [];

  const { data: fieldsData } = useQuery({
    queryKey: ["rn-fields", integrationId, connectionKey, accountId],
    queryFn: () => listFields(integrationId, connectionKey, accountId),
    enabled: connected && !!integrationId,
  });

  const metricFields = useMemo(() => fieldsData?.fields.filter((f) => f.dim_met === "metric") ?? [], [fieldsData]);
  const dimensionField = fieldsData?.default_dimension ?? "day";

  const activeMetrics = selectedMetrics.length > 0 ? selectedMetrics : metricFields.slice(0, 4).map((f) => f.field_id);

  const {
    data: rows,
    isFetching: queryLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["rn-query", integrationId, connectionKey, accountId, activeMetrics.join(",")],
    queryFn: () =>
      runQuery<Record<string, string | number>>({
        integration_id: integrationId,
        connection_key: connectionKey,
        account_id: accountId,
        fields: [dimensionField, ...activeMetrics],
        date_range: { preset: "lastxdays", x: 30 },
        limit: 100,
      }),
    enabled: connected && !!integrationId && !!connectionKey && !!accountId && activeMetrics.length > 0,
  });

  if (!connected) {
    return (
      <Card className="text-center">
        <p className="text-sm text-slate-500">Connect your Reporting Ninja API key to see live reports here.</p>
        <Link to="/tenant/settings" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
          Go to Settings →
        </Link>
      </Card>
    );
  }

  const totals = activeMetrics.reduce<Record<string, number>>((acc, metric) => {
    acc[metric] = (rows ?? []).reduce((sum, row) => sum + (Number(row[metric]) || 0), 0);
    return acc;
  }, {});

  const chartData = (rows ?? [])
    .slice()
    .sort((a, b) => String(a[dimensionField]).localeCompare(String(b[dimensionField])))
    .map((row) => ({ label: String(row[dimensionField]), value: Number(row[activeMetrics[0]]) || 0 }));

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select label="Integration" value={integrationId} onChange={(v) => {
            setIntegrationId(v);
            setConnectionKey("");
            setAccountId("");
            setSelectedMetrics([]);
          }}>
            <option value="">Select…</option>
            {integrations?.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>

          <Select
            label="Account"
            value={accountId ? `${connectionKey}::${accountId}` : ""}
            onChange={(v) => {
              const [ck, aid] = v.split("::");
              setConnectionKey(ck ?? "");
              setAccountId(aid ?? "");
            }}
          >
            <option value="">Select…</option>
            {accounts.map((a) => (
              <option key={`${a.connectionKey}::${a.account_id}`} value={`${a.connectionKey}::${a.account_id}`}>
                {a.account_name}
              </option>
            ))}
          </Select>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Metrics</label>
            <div className="flex flex-wrap gap-2">
              {metricFields.slice(0, 8).map((f) => {
                const active = activeMetrics.includes(f.field_id);
                return (
                  <button
                    key={f.field_id}
                    type="button"
                    onClick={() =>
                      setSelectedMetrics((prev) =>
                        prev.includes(f.field_id) ? prev.filter((m) => m !== f.field_id) : [...prev, f.field_id]
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      active
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {f.field_name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {queryError && <p className="text-sm text-red-500">Failed to load data — try re-testing your key.</p>}
      {queryLoading && <p className="text-sm text-slate-400">Loading data…</p>}

      {rows && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeMetrics.map((metric, i) => {
              const field = metricFields.find((f) => f.field_id === metric);
              return (
                <GlowCard
                  key={metric}
                  label={field?.field_name ?? metric}
                  value={totals[metric]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  accent={ACCENTS[i % ACCENTS.length]}
                />
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {metricFields.find((f) => f.field_id === activeMetrics[0])?.field_name ?? activeMetrics[0]} — last 30 days
            </h2>
            <RevenueChart data={chartData} />
          </div>
        </>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
      >
        {children}
      </select>
    </div>
  );
}
