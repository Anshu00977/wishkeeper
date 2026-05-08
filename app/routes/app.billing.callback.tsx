import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getActiveSubscription } from "../services/billing.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);

    const subscription = await getActiveSubscription(admin);

    if (!subscription || subscription.status !== "ACTIVE") {
        // Payment was declined or cancelled
        return redirect("/app/billing?status=cancelled");
    }

    // Subscription is active — go to app home
    return redirect("/app?status=subscribed");
}