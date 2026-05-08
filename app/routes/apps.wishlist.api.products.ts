// import type { LoaderFunctionArgs } from "@remix-run/node";
// import { json } from "@remix-run/node";
// import prisma from "../db.server";
// import {
//   getStoreByShop,
//   getWishlist,
//   getStoreSettingsByShop,
// } from "../services/wishlist.server";

// const cors = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type",
// };

// /**
//  * Returns wishlist items enriched with product data (title, image, price, handle).
//  * Uses the store's offline access token to query the Shopify Admin API.
//  *
//  * GET /apps/wishlist/api/products?shop=xxx&customerId=yyy
//  */
// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const url = new URL(request.url);
//   const shop = url.searchParams.get("shop");
//   const customerId = url.searchParams.get("customerId");

//   if (!shop || !customerId) {
//     return json({ error: "Missing params" }, { status: 400, headers: cors });
//   }

//   const store = await getStoreByShop(shop);
//   if (!store) {
//     return json({ error: "Store not found" }, { status: 404, headers: cors });
//   }

//   // Get offline session for this shop
//   const session = await prisma.session.findFirst({
//     where: { shop, isOnline: false },
//   });

//   if (!session) {
//     return json({ error: "No session found" }, { status: 401, headers: cors });
//   }

//   const wishlist = await getWishlist(store.id, customerId);
//   const settings = await getStoreSettingsByShop(shop);

//   if (!wishlist.items.length) {
//     return json({ items: [], settings }, { headers: cors });
//   }

//   // Fetch product data from Shopify Admin API
//   const productIds = wishlist.items.map((item) => item.productId);

//   // Build GraphQL query to fetch all products at once
//   const query = `
//     query getProducts($ids: [ID!]!) {
//       nodes(ids: $ids) {
//         ... on Product {
//           id
//           title
//           handle
//           vendor
//           featuredImage {
//             url
//             altText
//           }
//           priceRange {
//             minVariantPrice {
//               amount
//               currencyCode
//             }
//             maxVariantPrice {
//               amount
//               currencyCode
//             }
//           }
//           variants(first: 1) {
//             edges {
//               node {
//                 id
//                 availableForSale
//               }
//             }
//           }
//         }
//       }
//     }
//   `;

//   // Product IDs need to be in GID format: gid://shopify/Product/12345
//   const gids = productIds.map((id) =>
//     id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
//   );

//   try {
//     const response = await fetch(
//       `https://${shop}/admin/api/2024-10/graphql.json`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Shopify-Access-Token": session.accessToken,
//         },
//         body: JSON.stringify({ query, variables: { ids: gids } }),
//       }
//     );

//     const data = await response.json();
//     const nodes = data?.data?.nodes || [];

//     // Map product data back to wishlist items
//     const enrichedItems = wishlist.items.map((item) => {
//       const gid = item.productId.startsWith("gid://")
//         ? item.productId
//         : `gid://shopify/Product/${item.productId}`;

//       const product = nodes.find((n: any) => n?.id === gid);

//       return {
//         id: item.id,
//         productId: item.productId,
//         variantId: item.variantId,
//         addedAt: item.addedAt,
//         product: product
//           ? {
//               title: product.title,
//               handle: product.handle,
//               vendor: product.vendor,
//               image: product.featuredImage?.url || null,
//               imageAlt: product.featuredImage?.altText || product.title,
//               price: product.priceRange?.minVariantPrice?.amount || "0",
//               compareAtPrice: 
//                 product.priceRange?.maxVariantPrice?.amount || null,
//               currency:
//                 product.priceRange?.minVariantPrice?.currencyCode || "USD",
//               available:
//                 product.variants?.edges?.[0]?.node?.availableForSale ?? true,
//             }
//           : null,
//       };
//     });

//     return json({ items: enrichedItems, settings }, { headers: cors });
//   } catch (error: any) {
//     console.error("Shopify API error:", error);
//     return json(
//       { error: "Failed to fetch product data", items: [], settings },
//       { status: 500, headers: cors }
//     );
//   }
// };


import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";
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

/**
 * Returns wishlist items enriched with product data (title, image, price, handle).
 * Uses the store's offline access token to query the Shopify Admin API.
 *
 * GET /apps/wishlist/api/products?shop=xxx&customerId=yyy
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const customerId = url.searchParams.get("customerId");

  if (!shop || !customerId) {
    return json({ error: "Missing params" }, { status: 400, headers: cors });
  }

  const store = await getStoreByShop(shop);
  if (!store) {
    return json({ error: "Store not found" }, { status: 404, headers: cors });
  }

  // Get offline session for this shop
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
  });

  if (!session) {
    return json({ error: "No session found" }, { status: 401, headers: cors });
  }

  const wishlist = await getWishlist(store.id, customerId);
  const settings = await getStoreSettingsByShop(shop);

  if (!wishlist.items.length) {
    return json({ items: [], settings }, { headers: cors });
  }

  // Fetch product data from Shopify Admin API
  const productIds = wishlist.items.map((item) => item.productId);

  // FIX 1: Changed priceRangeV2 → priceRange (priceRangeV2 is deprecated)
  const query = `
    query getProducts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          title
          handle
          vendor
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                availableForSale
              }
            }
          }
        }
      }
    }
  `;

  // Product IDs need to be in GID format: gid://shopify/Product/12345
  const gids = productIds.map((id) =>
    id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`
  );

  try {
    // FIX 2: Updated API version from 2024-10 to 2025-04
    const response = await fetch(
      `https://${shop}/admin/api/2025-04/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({ query, variables: { ids: gids } }),
      }
    );

    const data = await response.json();

    // FIX 3: Log errors so they don't fail silently
    if (data.errors) {
      console.error("Shopify GraphQL errors:", JSON.stringify(data.errors));
      return json(
        { error: "GraphQL query failed", details: data.errors, items: [], settings },
        { status: 500, headers: cors }
      );
    }

    const nodes = data?.data?.nodes || [];

    // Map product data back to wishlist items
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
        // FIX 1 continued: Updated priceRangeV2 → priceRange in response mapping
        product: product
          ? {
              title: product.title,
              handle: product.handle,
              vendor: product.vendor,
              image: product.featuredImage?.url || null,
              imageAlt: product.featuredImage?.altText || product.title,
              price: product.priceRange?.minVariantPrice?.amount || "0",
              compareAtPrice:
                product.priceRange?.maxVariantPrice?.amount || null,
              currency:
                product.priceRange?.minVariantPrice?.currencyCode || "USD",
              available:
                product.variants?.edges?.[0]?.node?.availableForSale ?? true,
            }
          : null,
      };
    });

    return json({ items: enrichedItems, settings }, { headers: cors });
  } catch (error: any) {
    console.error("Shopify API error:", error);
    return json(
      { error: "Failed to fetch product data", items: [], settings },
      { status: 500, headers: cors }
    );
  }
};