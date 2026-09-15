import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import { updateShopPlan } from "../utils/planUtils";

interface ActiveSubscription {
  id: string;
  name: string;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "DECLINED" | "FROZEN" | "CANCELLED";
}

interface LoaderData {
  ok: boolean;
  plan: { key: string; label: string } | null;
}

const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const response = await admin.graphql(ACTIVE_SUBSCRIPTION_QUERY);
    const data = await response.json();
    const activeSubscriptions = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    const activeSub = activeSubscriptions.find(
      (sub: ActiveSubscription) => sub.status === "ACTIVE" || sub.status === "PENDING"
    );

    if (activeSub) {
      const planKey = activeSub.name.toLowerCase().includes("pro") ? "pro" : "basic";
      const label = planKey === "pro" ? "Pro Plan" : "Basic Plan";
      await updateShopPlan(shop, planKey, activeSub.id);
      return { ok: true, plan: { key: planKey, label } } satisfies LoaderData;
    }

    await updateShopPlan(shop, "none", null);
    return { ok: false, plan: null } satisfies LoaderData;

  } catch (err) {
    console.error("[billing-return] error:", err);
    return { ok: false, plan: null } satisfies LoaderData;
  }
};

export default function BillingReturnPage() {
  const { ok, plan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate(ok ? "/app" : "/app/billing"), 5000);
    return () => clearTimeout(timer);
  }, [navigate, ok]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "24px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 480, width: "90%", textAlign: "center" }}>
        {ok && plan ? (
          <div style={{ background: "#dcfce7", border: "1px solid rgba(22,163,74,0.25)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#16a34a", margin: "0 0 8px" }}>Plan activated successfully!</p>
            <p style={{ fontSize: 13, color: "#166534", margin: 0 }}>You are now on the <strong>{plan.label}</strong> plan. Redirecting to dashboard…</p>
          </div>
        ) : (
          <div style={{ background: "#fef9c3", border: "1px solid rgba(202,138,4,0.25)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#854d0e", margin: "0 0 8px" }}>Could not confirm plan.</p>
            <p style={{ fontSize: 13, color: "#854d0e", margin: 0 }}>Your subscription may be pending. Redirecting back…</p>
          </div>
        )}
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#b8922a", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 13, color: "#a39a8e" }}>Redirecting in 5 seconds…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}