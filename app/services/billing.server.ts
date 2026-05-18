import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export const PLANS = {
    basic: {
        name: "basic",
        displayName: "Basic Plan",
        price: 9.99,
        interval: "EVERY_30_DAYS" as const,
        trialDays: 7,
        features: [
            "Save up to 10 wishlist items",
            "Simple wishlist management",
            "Mobile friendly",
            "Fast access",
        ],
    },
    pro: {
        name: "pro",
        displayName: "Pro Plan",
        price: 14.99,
        interval: "EVERY_30_DAYS" as const,
        trialDays: 7,
        features: [
            "Save up to Infinity wishlist items",
            "Simple wishlist management",
            "Mobile friendly",
            "Fast access",
        ],
    },
} as const;

export type PlanKey = keyof typeof PLANS;

const SUBSCRIPTION_CREATE = `
  mutation appSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
    $trialDays: Int
    $test: Boolean
  ) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      trialDays: $trialDays
      test: $test
    ) {
      userErrors { field message }
      confirmationUrl
      appSubscription { id status }
    }
  }
`;

const ACTIVE_SUBSCRIPTION_QUERY = `
  query {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        currentPeriodEnd
        trialDays
        lineItems {
          plan {
            pricingDetails {
              ... on AppRecurringPricing {
                price { amount currencyCode }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

const SUBSCRIPTION_CANCEL = `
  mutation appSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      userErrors { field message }
      appSubscription { id status }
    }
  }
`;

export async function getActiveSubscription(admin: AdminApiContext) {
    const response = await admin.graphql(ACTIVE_SUBSCRIPTION_QUERY);
    const data = await response.json();
    const subs = data?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    return subs[0] ?? null;
}

export function getActivePlanKey(
    subscription: Awaited<ReturnType<typeof getActiveSubscription>>
): PlanKey | null {
    if (!subscription) return null;
    const name = subscription.name?.toLowerCase() ?? "";
   if (name.includes("pro")) return "pro";
return "basic";
}

export async function createSubscription(
    admin: AdminApiContext,
    planKey: PlanKey,
    shop: string,
    returnPath = "/app/billing-return"
) {
    const plan = PLANS[planKey];
    const returnUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}${returnPath}`;

    const response = await admin.graphql(SUBSCRIPTION_CREATE, {
        variables: {
            name: plan.name,
            returnUrl,
            trialDays: plan.trialDays > 0 ? plan.trialDays : undefined,
            test: true,
            lineItems: [
                {
                    plan: {
                        appRecurringPricingDetails: {
                            price: { amount: plan.price, currencyCode: "USD" },
                            interval: plan.interval,
                        },
                    },
                },
            ],
        },
    });

    const data = await response.json();
    const result = data?.data?.appSubscriptionCreate;

    if (result?.userErrors?.length) {
        throw new Error(result.userErrors[0].message);
    }

    return result?.confirmationUrl as string;
}

export async function cancelSubscription(
    admin: AdminApiContext,
    subscriptionId: string
) {
    const response = await admin.graphql(SUBSCRIPTION_CANCEL, {
        variables: { id: subscriptionId },
    });
    const data = await response.json();
    const result = data?.data?.appSubscriptionCancel;
    if (result?.userErrors?.length) {
        throw new Error(result.userErrors[0].message);
    }
    return result?.appSubscription;
}