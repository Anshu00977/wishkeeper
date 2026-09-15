import { useCallback, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useActionData,
  useNavigate,
} from "react-router";
import { Page } from "@shopify/polaris";
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
import billingStyles from "../styles/billing.css?url";

export const links = () => [{ rel: "stylesheet", href: billingStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const subscription = await getActiveSubscription(admin);
  const activePlanKey = getActivePlanKey(subscription);
  return data({ subscription, activePlanKey, shop: session.shop, plans: PLANS });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "subscribe") {
    const planKey = formData.get("plan") as PlanKey;
    const confirmationUrl = await createSubscription(admin, planKey, session.shop);
    return data({ confirmationUrl });
  }
  if (intent === "cancel") {
    const subscriptionId = formData.get("subscriptionId") as string;
    await cancelSubscription(admin, subscriptionId);
    return data({ success: true });
  }
  return data({ error: "Unknown intent" }, { status: 400 });
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconCheck = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

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
    if (actionData?.success) navigate("/app/billing");
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
    submit({ intent: "cancel", subscriptionId: subscription.id }, { method: "POST" });
  }, [submit, subscription]);

  const nextBilling = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <Page>
      <TitleBar title="Billing & Plans" />
      <div className="bl-root">
        <div className="bl-header">
          <div className="bl-header__left">
            <div className="bl-header__eyebrow">Subscription</div>
            <h1 className="bl-header__title">Billing &amp; <em>Plans</em></h1>
            <p className="bl-header__sub">Choose the plan that fits your store. Upgrade or cancel anytime.</p>
          </div>
        </div>

        {subscription && (
          <div className="bl-banner">
            <div className="bl-banner__icon" style={{ color: "var(--green)" }}><IconShield /></div>
            <div className="bl-banner__body">
              <p className="bl-banner__title">You&rsquo;re on the {activePlanKey?.toUpperCase()} plan</p>
              {nextBilling && (
                <p className="bl-banner__sub"><IconCalendar /> &nbsp;Next billing date: {nextBilling}</p>
              )}
            </div>
            <span className="bl-banner__badge"><IconCheck size={9} /> Active</span>
          </div>
        )}

        <div className="bl-plans-grid">
          {(Object.keys(plans) as PlanKey[]).map((planKey) => {
            const plan = plans[planKey];
            const isActive = activePlanKey === planKey;
            const isPro = planKey === "pro";
            const isCurrentlyLoading = isLoading && navigation.formData?.get("plan") === planKey;
            const isCancelling = isLoading && navigation.formData?.get("intent") === "cancel";

            return (
              <div key={planKey} className={["bl-plan-card", isActive ? "bl-plan-card--active" : "", isPro ? "bl-plan-card--pro" : ""].join(" ")}>
                {isPro && !isActive && <div className="bl-plan-card__popular">Most Popular</div>}

                <div className="bl-plan-card__head">
                  <h2 className="bl-plan-card__name">{planKey.charAt(0).toUpperCase() + planKey.slice(1)}</h2>
                  <div className="bl-plan-card__price-row">
                    <span className="bl-plan-card__currency">$</span>
                    <span className="bl-plan-card__price">{plan.price}</span>
                    <span className="bl-plan-card__period">/ month</span>
                  </div>
                  {plan.trialDays > 0 && !isActive && (
                    <span className="bl-plan-card__trial"><IconStar /> {plan.trialDays}-day free trial</span>
                  )}
                </div>

                <div className="bl-plan-card__body">
                  <div>
                    <div className="bl-plan-card__features-label">What&rsquo;s included</div>
                    <ul className="bl-plan-card__features">
                      {plan.features.map((f: string) => (
                        <li key={f} className="bl-plan-card__feature">
                          <span className={`bl-plan-card__feature-check ${isPro ? "bl-plan-card__feature-check--violet" : "bl-plan-card__feature-check--gold"}`}>
                            <IconCheck size={8} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bl-plan-card__footer">
                  <div className="bl-plan-card__divider" />
                  {isActive ? (
                    <>
                      <button className="bl-btn bl-btn--current" disabled>
                        <IconCheck size={11} /> Current Plan
                      </button>
                      {subscription?.id && (
                        <button className="bl-btn bl-btn--outline" onClick={handleCancel} disabled={isLoading}>
                          {isCancelling ? <><span className="bl-spinner" /> Cancelling…</> : "Cancel Subscription"}
                        </button>
                      )}
                    </>
                  ) : (
                    <button className={`bl-btn ${isPro ? "bl-btn--violet" : "bl-btn--gold"}`} onClick={() => handleSubscribe(planKey)} disabled={isLoading}>
                      {isCurrentlyLoading ? (
                        <><span className="bl-spinner" /> Processing…</>
                      ) : isPro ? (
                        <><IconStar /> Upgrade to Pro</>
                      ) : (
                        <><IconCheck size={11} /> Get Basic Plan</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}