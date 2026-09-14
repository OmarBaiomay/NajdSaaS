import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore, isAgencyLevel, isTenantLevel } from "@/store/authStore";

interface ProtectedRouteProps {
  scope: "agency" | "tenant";
}

/** Confirms session on mount (via GET /auth/me) and gates a route subtree by scope. */
export function ProtectedRoute({ scope }: ProtectedRouteProps) {
  const { user, status, setUser, setStatus } = useAuthStore();

  useEffect(() => {
    if (status !== "idle") return;
    setStatus("loading");
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.auth))
      .catch(() => setUser(null));
  }, [status, setUser, setStatus]);

  if (status === "idle" || status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  const allowed = scope === "agency" ? isAgencyLevel(user.role) : isTenantLevel(user.role);
  if (!allowed) return <Navigate to={isAgencyLevel(user.role) ? "/agency" : "/tenant"} replace />;

  return <Outlet />;
}
