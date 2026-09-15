import type { LoaderFunctionArgs } from "react-router";
import { data as dataResponse } from "react-router";
import {
  getStoreByShop,
  getWishlist,
  getStoreSettingsByShop,
} from "../services/wishlist.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("customerId");

  if (!shop || !customerId) {
    return dataResponse({ error: "Missing params" }, { status: 400, headers: cors });
  }

  const store = await getStoreByShop(shop);
  if (!store) {
    return dataResponse({ error: "Store not found" }, { status: 404, headers: cors });
  }

  const settings = await getStoreSettingsByShop(shop);
  const storefrontToken = settings?.storefrontToken;

  if (!storefrontToken) {
    return dataResponse({ error: "Storefront token not configured" }, { status: 401, headers: cors });
  }

  const wishlist = await getWishlist(store.id, customerId);

  if (!wishlist.items.length) {
    return dataResponse({ items: [], settings }, { headers: cors });
  }

  const productIds = wishlist.items.map((item) => item.productId);
  const gids = productIds.map((id) =>
    id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
  );

  const query = `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          handle
          vendor
          featuredImage { url altText }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          variants(first: 1) {
            edges {
              node { id availableForSale }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shop}/api/2025-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query, variables: { ids: gids } }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("Storefront GraphQL errors:", JSON.stringify(result.errors));
      return dataResponse({ error: "GraphQL error", items: [], settings }, { status: 500, headers: cors });
    }

    const nodes = result?.data?.nodes || [];

    const enrichedItems = wishlist.items.map((item) => {
      const gid = item.productId.startsWith("gid://")
        ? item.productId
        : `gid://shopify/Product/${item.productId}`;

      const product = nodes.find((n: any) => n?.id === gid);

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        addedAt: item.addedAt,
        product: product
          ? {
              title: product.title,
              handle: product.handle,
              vendor: product.vendor,
              image: product.featuredImage?.url || null,
              imageAlt: product.featuredImage?.altText || product.title,
              price: product.priceRange?.minVariantPrice?.amount || "0",
              currency: product.priceRange?.minVariantPrice?.currencyCode || "USD",
              available: product.variants?.edges?.[0]?.node?.availableForSale ?? true,
            }
          : null,
      };
    });

    return dataResponse({ items: enrichedItems, settings }, { headers: cors });
  } catch (error: any) {
    console.error("Storefront API error:", error);
    return dataResponse({ error: "Failed to fetch product data", items: [], settings }, { status: 500, headers: cors });
  }
};