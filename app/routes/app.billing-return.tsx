import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import {
    Page,
    Spinner,
    BlockStack,
    Text,
    Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { updateShopPlan } from "../utils/planUtils";

interface ActiveSubscription {
    id: string;
    name: string;
    status: "ACTIVE" | "PENDING" | "EXPIRED" | "DECLINED" | "FROZEN" | "CANCELLED";
}

interface ActiveSubscriptionResponse {
    data?: {
        currentAppInstallation?: {
            activeSubscriptions?: ActiveSubscription[];
        };
    };
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
        const data: ActiveSubscriptionResponse = await response.json();

        const activeSubscriptions =
            data?.data?.currentAppInstallation?.activeSubscriptions ?? [];

        const activeSub = activeSubscriptions.find(
            (sub) => sub.status === "ACTIVE" || sub.status === "PENDING"
        );

        if (activeSub) {
            const planKey = activeSub.name.toLowerCase().includes("pro") ? "pro" : "free";
            const label = planKey === "pro" ? "Pro Plan" : "Basic Plan";

            await updateShopPlan(shop, planKey, activeSub.id);

            return {
                ok: true,
                plan: { key: planKey, label },
            } satisfies LoaderData;
        }

        await updateShopPlan(shop, "free", null);
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
        <Page>
            <TitleBar title="Billing" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "24px" }}>
                <BlockStack gap="400" inlineAlign="center">
                    {ok && plan ? (
                        <Banner tone="success" title="Plan activated successfully!">
                            <Text as="p">
                                You are now on the <strong>{plan.label}</strong> plan. Redirecting you to dashboard…
                            </Text>
                        </Banner>
                    ) : (
                        <Banner tone="warning" title="Could not confirm plan.">
                            <Text as="p">
                                Your subscription may have been cancelled or is still pending. Redirecting you back.
                            </Text>
                        </Banner>
                    )}

                    <Spinner size="large" />

                    <Text tone="subdued" variant="bodySm" as="p">
                        Redirecting in 5 seconds…
                    </Text>
                </BlockStack>
            </div>
        </Page>
    );
}