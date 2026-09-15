import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import {
  getStoreByShop,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  isInWishlist,
  mergeGuestWishlist,
  getWishlistCount,
  getStoreSettingsByShop,
} from "../services/wishlist.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("customerId");
  const productId = url.searchParams.get("productId");
  const action = url.searchParams.get("action");

  if (!shop || !customerId) {
    return data({ error: "Missing shop or customerId" }, { status: 400, headers: cors });
  }

  const store = await getStoreByShop(shop);
  if (!store || !store.isActive) {
    return data({ error: "Store not found" }, { status: 404, headers: cors });
  }

  if (action === "check" && productId) {
    const inWishlist = await isInWishlist(store.id, customerId, productId);
    return data({ inWishlist }, { headers: cors });
  }

  if (action === "count") {
    const count = await getWishlistCount(store.id, customerId);
    return data({ count }, { headers: cors });
  }

  if (action === "settings") {
    const settings = await getStoreSettingsByShop(shop);
    return data({ settings }, { headers: cors });
  }

  const wishlist = await getWishlist(store.id, customerId);
  return data({ wishlist }, { headers: cors });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const body = await request.json();
  const { shop, customerId, productId, variantId, action, guestId } = body;

  if (!shop || !customerId) {
    return data({ error: "Missing shop or customerId" }, { status: 400, headers: cors });
  }

  const store = await getStoreByShop(shop);
  if (!store || !store.isActive) {
    return data({ error: "Store not found" }, { status: 404, headers: cors });
  }

  try {
    switch (action) {
      case "add": {
        if (!productId) {
          return data({ error: "Missing productId" }, { status: 400, headers: cors });
        }
        const item = await addWishlistItem(store.id, customerId, productId, variantId);
        return data({ success: true, item }, { headers: cors });
      }
      case "remove": {
        if (!productId) {
          return data({ error: "Missing productId" }, { status: 400, headers: cors });
        }
        await removeWishlistItem(store.id, customerId, productId, variantId);
        return data({ success: true }, { headers: cors });
      }
      case "merge": {
        if (!guestId) {
          return data({ error: "Missing guestId" }, { status: 400, headers: cors });
        }
        await mergeGuestWishlist(store.id, guestId, customerId);
        return data({ success: true }, { headers: cors });
      }
      default:
        return data({ error: `Unknown action: ${action}` }, { status: 400, headers: cors });
    }
  } catch (error: any) {
    return data({ error: error.message || "Internal error" }, { status: 500, headers: cors });
  }
};