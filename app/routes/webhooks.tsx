import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface WebhookPayload {
  customer?: {
    id: number;
    email: string;
    phone: string;
  };
  shop_id?: number;
  shop_domain?: string;
  orders_to_redact?: number[];
  [key: string]: unknown;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("🎯 Webhook received at:", new Date().toISOString());

  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log("✅ HMAC verification passed");
    console.log(`✅ Topic: ${topic}`);
    console.log(`✅ Shop: ${shop}`);
    console.log(`✅ Payload:`, payload);

    switch (topic) {
      case "CUSTOMERS_DATA_REQUEST":
        console.log("📋 Processing customer data request");
        await handleCustomerDataRequest(payload as WebhookPayload, shop);
        break;

      case "CUSTOMERS_REDACT":
        console.log("🗑️ Processing customer redaction");
        await handleCustomerRedact(payload as WebhookPayload, shop);
        break;

      case "SHOP_REDACT":
        console.log("🗑️ Processing shop redaction");
        await handleShopRedact(payload as WebhookPayload, shop);
        break;

      default:
        console.log(`⚠️ Unhandled webhook topic: ${topic}`);
    }

    return new Response("Webhook processed successfully", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };

    console.error("❌ Webhook error:", err);
    console.error("Error details:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });

    if (
      err.message?.toLowerCase().includes("hmac") ||
      err.message?.toLowerCase().includes("unauthorized") ||
      err.message?.toLowerCase().includes("authentication") ||
      err.message?.toLowerCase().includes("invalid") ||
      err.status === 401
    ) {
      console.log("❌ Returning 401 - HMAC verification failed");
      return new Response("Unauthorized - Invalid HMAC signature", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.log("❌ Returning 500 - Internal server error");
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

async function handleCustomerDataRequest(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`No customer data stored for shop: ${shop}`);
}

async function handleCustomerRedact(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`No customer data to redact for shop: ${shop}`);
}

async function handleShopRedact(payload: WebhookPayload, shop: string): Promise<void> {
  console.log(`Shop data redaction requested for: ${shop}`);
}