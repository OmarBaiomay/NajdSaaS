import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import Login from "@/pages/auth/Login";
import AgencyDashboard from "@/pages/agency/Dashboard";
import Tenants from "@/pages/agency/Tenants";
import TenantDashboard from "@/pages/tenant/Dashboard";
import IntegrationsOverview from "@/pages/integrations/IntegrationsOverview";
import IntegrationDetail from "@/pages/integrations/IntegrationDetail";
import { CUSTOM_INTEGRATION_PAGES } from "@/pages/integrations/custom/registry";
import IntegrationSettings from "@/pages/tenant/IntegrationSettings";
import AgencySettings from "@/pages/agency/Settings";
import Users from "@/pages/shared/Users";
import { AgencyLayout } from "@/components/layout/AgencyLayout";
import { TenantLayout } from "@/components/layout/TenantLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AgencyTenantGate } from "@/routes/AgencyTenantGate";

// Forces a full remount of IntegrationDetail when navigating between
// integrations (same route element, different :integrationId) so each
// integration starts with fresh account/data-view/metric selections.
function IntegrationDetailRoute() {
  const { integrationId } = useParams<{ integrationId: string }>();
  const CustomPage = integrationId ? CUSTOM_INTEGRATION_PAGES[integrationId] : undefined;
  if (CustomPage) return <CustomPage key={integrationId} />;
  return <IntegrationDetail key={integrationId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute scope="agency" />}>
          <Route element={<AgencyLayout />}>
            <Route path="/agency" element={<AgencyDashboard />} />
            <Route path="/agency/tenants" element={<Tenants />} />
            <Route path="/agency/users" element={<Users />} />
            <Route path="/agency/settings" element={<AgencySettings />} />

            <Route element={<AgencyTenantGate />}>
              <Route path="/agency/integrations" element={<IntegrationsOverview />} />
              <Route path="/agency/integrations/:integrationId" element={<IntegrationDetailRoute />} />
              <Route path="/agency/tenant-settings" element={<IntegrationSettings />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute scope="tenant" />}>
          <Route element={<TenantLayout />}>
            <Route path="/tenant" element={<TenantDashboard />} />
            <Route path="/tenant/integrations" element={<IntegrationsOverview />} />
            <Route path="/tenant/integrations/:integrationId" element={<IntegrationDetailRoute />} />
            <Route path="/tenant/users" element={<Users />} />
            <Route path="/tenant/settings" element={<IntegrationSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
