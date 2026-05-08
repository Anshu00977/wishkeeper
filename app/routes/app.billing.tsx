import { useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useNavigate } from "@remix-run/react";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    InlineStack,
    Text,
    Badge,
    Button,
    List,
    Divider,
    Banner,
    Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
    PLANS,
    getActiveSubscription,
    getActivePlanKey,
    createSubscription,
    cancelSubscription,
    type PlanKey,
} from "../services/billing.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const { admin, session } = await authenticate.admin(request);
    const subscription = await getActiveSubscription(admin);
    const activePlanKey = getActivePlanKey(subscription);

    return json({
        subscription,
        activePlanKey,
        shop: session.shop,
        plans: PLANS,
    });
}

export async function action({ request }: ActionFunctionArgs) {
    const { admin, session } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (intent === "subscribe") {
        const planKey = formData.get("plan") as PlanKey;
        const confirmationUrl = await createSubscription(admin, planKey, session.shop);
        return json({ confirmationUrl });
    }

    if (intent === "cancel") {
        const subscriptionId = formData.get("subscriptionId") as string;
        await cancelSubscription(admin, subscriptionId);
        return json({ success: true });
    }

    return json({ error: "Unknown intent" }, { status: 400 });
}

export default function BillingPage() {
    const { subscription, activePlanKey, plans } = useLoaderData<typeof loader>();
    const actionData = useActionData<{ confirmationUrl?: string; success?: boolean }>();
    const submit = useSubmit();
    const navigate = useNavigate();
    const navigation = useNavigation();
    const isLoading = navigation.state !== "idle";

    useEffect(() => {
        if (actionData?.confirmationUrl) {
            window.open(actionData.confirmationUrl, "_top");
        }
    }, [actionData]);

    useEffect(() => {
        if (actionData?.success) {
            navigate("/app/billing");
        }
    }, [actionData, navigate]);

    const handleSubscribe = useCallback(
        (planKey: PlanKey) => {
            submit({ intent: "subscribe", plan: planKey }, { method: "POST" });
        },
        [submit]
    );

    const handleCancel = useCallback(() => {
        if (!subscription?.id) return;
        if (!confirm("Are you sure you want to cancel your subscription?")) return;
        submit(
            { intent: "cancel", subscriptionId: subscription.id },
            { method: "POST" }
        );
    }, [submit, subscription]);

    return (
        <Page>
            <TitleBar title="Billing & Plans" />
            <BlockStack gap="500">
                {subscription && (
                    <Banner title={`You're on the ${activePlanKey?.toUpperCase()} plan`} tone="success">
                        <Text as="p" variant="bodyMd">
                            Next billing date:{" "}
                            {subscription.currentPeriodEnd
                                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                : "—"}
                        </Text>
                    </Banner>
                )}

                <Layout>
                    {(Object.keys(plans) as PlanKey[]).map((planKey) => {
                        const plan = plans[planKey];
                        const isActive = activePlanKey === planKey;
                        const isCurrentlyLoading =
                            isLoading && navigation.formData?.get("plan") === planKey;

                        return (
                            <Layout.Section key={planKey} variant="oneHalf">
                                <Card>
                                    <BlockStack gap="400">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <BlockStack gap="100">
                                                <InlineStack gap="200" blockAlign="center">
                                                    <Text as="h2" variant="headingMd">
                                                        {planKey}
                                                    </Text>
                                                    {isActive && <Badge tone="success">Current plan</Badge>}
                                                    {plan.trialDays > 0 && !isActive && (
                                                        <Badge tone="info">{plan.trialDays}-day free trial</Badge>
                                                    )}
                                                </InlineStack>
                                                <Text as="p" variant="bodyLg" fontWeight="semibold">
                                                    ${plan.price}/month
                                                </Text>
                                            </BlockStack>
                                        </InlineStack>

                                        <Divider />

                                        <BlockStack gap="200">
                                            <Text as="p" variant="bodyMd" tone="subdued">
                                                Top features
                                            </Text>
                                            <List type="bullet">
                                                {plan.features.map((f) => (
                                                    <List.Item key={f}>{f}</List.Item>
                                                ))}
                                            </List>
                                        </BlockStack>

                                        <Divider />

                                        <Box>
                                            {isActive ? (
                                                <InlineStack gap="300">
                                                    <Button disabled variant="primary">Current Plan</Button>
                                                    {subscription?.id && (
                                                        <Button
                                                            tone="critical"
                                                            onClick={handleCancel}
                                                            loading={
                                                                isLoading &&
                                                                navigation.formData?.get("intent") === "cancel"
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </InlineStack>
                                            ) : (
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleSubscribe(planKey)}
                                                    loading={isCurrentlyLoading}
                                                    disabled={isLoading}
                                                >
                                                    {planKey === "pro" ? "Upgrade to Pro" : "Get Basic Plan"}
                                                </Button>
                                            )}
                                        </Box>
                                    </BlockStack>
                                </Card>
                            </Layout.Section>
                        );
                    })}
                </Layout>
            </BlockStack>
        </Page>
    );
}