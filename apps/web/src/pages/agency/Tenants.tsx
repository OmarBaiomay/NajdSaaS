import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export default function Tenants() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => (await api.get<{ tenants: Tenant[] }>("/tenants")).data.tenants,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load tenants.</p>;

  return (
    <div className="space-y-4">
      {data?.length === 0 && <Card>No tenants yet.</Card>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((tenant) => (
          <Card key={tenant.id}>
            <p className="font-semibold">{tenant.name}</p>
            <p className="text-sm text-slate-500">{tenant.slug}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {tenant.status}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
