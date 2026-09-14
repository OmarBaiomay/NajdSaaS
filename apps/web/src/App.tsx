import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "@/pages/auth/Login";
import AgencyDashboard from "@/pages/agency/Dashboard";
import Tenants from "@/pages/agency/Tenants";
import TenantDashboard from "@/pages/tenant/Dashboard";
import IntegrationsOverview from "@/pages/integrations/IntegrationsOverview";
import IntegrationDetail from "@/pages/integrations/IntegrationDetail";
import IntegrationSettings from "@/pages/tenant/IntegrationSettings";
import Placeholder from "@/pages/Placeholder";
import { AgencyLayout } from "@/components/layout/AgencyLayout";
import { TenantLayout } from "@/components/layout/TenantLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AgencyTenantGate } from "@/routes/AgencyTenantGate";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute scope="agency" />}>
          <Route element={<AgencyLayout />}>
            <Route path="/agency" element={<AgencyDashboard />} />
            <Route path="/agency/tenants" element={<Tenants />} />
            <Route path="/agency/users" element={<Placeholder title="Users" />} />
            <Route path="/agency/settings" element={<Placeholder title="Settings" />} />

            <Route element={<AgencyTenantGate />}>
              <Route path="/agency/integrations" element={<IntegrationsOverview />} />
              <Route path="/agency/integrations/:integrationId" element={<IntegrationDetail />} />
              <Route path="/agency/tenant-settings" element={<IntegrationSettings />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute scope="tenant" />}>
          <Route element={<TenantLayout />}>
            <Route path="/tenant" element={<TenantDashboard />} />
            <Route path="/tenant/integrations" element={<IntegrationsOverview />} />
            <Route path="/tenant/integrations/:integrationId" element={<IntegrationDetail />} />
            <Route path="/tenant/users" element={<Placeholder title="Users" />} />
            <Route path="/tenant/settings" element={<IntegrationSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
