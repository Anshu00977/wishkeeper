import type { LoaderFunctionArgs } from "@remix-run/node";
import { getStoreByShop } from "../services/wishlist.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) return new Response("Missing shop", { status: 400 });
  const store = await getStoreByShop(shop);
  if (!store) return new Response("Store not found", { status: 404 });

  const appUrl = process.env.SHOPIFY_APP_URL || "https://wishkeeper.kaswebtechsolutions.com";

  const liquid = `
<link rel="stylesheet" href="${appUrl}/wishlist-page.css">

<div class="wl-page">
  <div class="wl-header">
    <h1>My Wishlist</h1>
    <div class="wl-header-right">
      <span class="wl-count" id="wl-count">Loading...</span>
      <button class="wl-share-btn" id="wl-share" style="display:none" onclick="window.__wlShare()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </div>
  </div>
  <div class="wl-grid" id="wl-grid">
    <div class="wl-loading">
      <div class="wl-spinner"></div>
      <p style="color:#9ca3af;font-size:14px">Loading your wishlist...</p>
    </div>
  </div>
</div>

<script>
  window.__wlPageConfig = {
    shop: {{ shop.permanent_domain | json }},
    proxyUrl: {{ shop.url | json }} + "/apps/wishlist",
    customerId: {{ customer.id | json }} || localStorage.getItem("wishlist_guest_id")
  };
</script>
<script src="${appUrl}/wishlist-page.js" defer></script>
`;

  return new Response(liquid, {
    headers: { "Content-Type": "application/liquid" },
  });
};