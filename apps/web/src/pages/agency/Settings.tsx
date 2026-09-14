import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getMyAgency, updateMyAgency } from "@/lib/agencies";

export default function AgencySettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: agency } = useQuery({ queryKey: ["agency-me"], queryFn: getMyAgency });

  const [name, setName] = useState("");
  const [locale, setLocale] = useState<"en" | "ar">("en");

  useEffect(() => {
    if (agency) {
      setName(agency.name);
      setLocale(agency.locale === "ar" ? "ar" : "en");
    }
  }, [agency]);

  const mutation = useMutation({
    mutationFn: updateMyAgency,
    onSuccess: (updated) => {
      queryClient.setQueryData(["agency-me"], updated);
    },
  });

  const dirty = agency ? name !== agency.name || locale !== agency.locale : false;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <h2 className="text-base font-semibold">{t("agencySettings.title")}</h2>
        <p className="text-sm text-slate-500">{t("agencySettings.subtitle")}</p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ name, locale });
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">{t("agencySettings.name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("agencySettings.slug")}</label>
            <input
              value={agency?.slug ?? ""}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 outline-none dark:border-slate-800 dark:bg-slate-800/50"
            />
            <p className="mt-1 text-xs text-slate-400">{t("agencySettings.slugHint")}</p>
          </div>

          <SearchableSelect
            label={t("agencySettings.locale")}
            value={locale}
            onChange={(v) => setLocale(v as "en" | "ar")}
            options={[
              { value: "en", label: t("language.en") },
              { value: "ar", label: t("language.ar") },
            ]}
            className="max-w-xs"
          />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!dirty || mutation.isPending}>
              {mutation.isPending ? "…" : t("common.save")}
            </Button>
            {mutation.isSuccess && !dirty && <span className="text-sm text-emerald-500">{t("agencySettings.saved")}</span>}
            {mutation.isError && <span className="text-sm text-red-500">{t("agencySettings.saveFailed")}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
