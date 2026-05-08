import type { LoaderFunctionArgs } from "@remix-run/node";
import { getStoreByShop } from "../services/wishlist.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) return new Response("Missing shop", { status: 400 });
  const store = await getStoreByShop(shop);
  if (!store) return new Response("Store not found", { status: 404 });

  const liquid = `
<style>
  :root {
    --wl-primary: #e74c6f;
    --wl-text: #1a1a1a;
    --wl-text-muted: #6b7280;
    --wl-border: #e5e7eb;
    --wl-radius: 12px;
    --wl-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --wl-shadow-hover: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04);
    --wl-columns: 4;
  }

  .wl-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    font-family: inherit;
    color: var(--wl-text);
  }

  .wl-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--wl-border);
    flex-wrap: wrap;
    gap: 12px;
  }
  .wl-header h1 {
    font-size: clamp(22px, 5vw, 32px);
    font-weight: 700;
    letter-spacing: -0.5px;
    margin: 0;
    white-space: nowrap;
  }
  .wl-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .wl-count {
    font-size: 14px;
    color: var(--wl-text-muted);
    background: #f3f4f6;
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 500;
    white-space: nowrap;
  }
  .wl-share-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1px solid var(--wl-border);
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: var(--wl-text-muted);
    transition: all 0.2s;
    white-space: nowrap;
  }
  .wl-share-btn:hover {
    border-color: var(--wl-primary);
    color: var(--wl-primary);
  }

  .wl-grid {
    display: grid;
    grid-template-columns: repeat(var(--wl-columns), 1fr);
    gap: 24px;
  }
  @media (max-width: 1024px) {
    .wl-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .wl-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  }
  @media (max-width: 480px) {
    .wl-page { padding: 20px 16px 60px; }
    .wl-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .wl-count { padding: 4px 10px; font-size: 12px; }
    .wl-share-btn { padding: 6px 10px; font-size: 12px; }
    .wl-header { margin-bottom: 24px; padding-bottom: 16px; }
  }

  .wl-card {
    background: #fff;
    border-radius: var(--wl-radius);
    overflow: hidden;
    box-shadow: var(--wl-shadow);
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
    position: relative;
  }
  .wl-card:hover {
    box-shadow: var(--wl-shadow-hover);
    transform: translateY(-4px);
  }
  .wl-card-img-wrap {
    position: relative;
    overflow: hidden;
    aspect-ratio: 1;
    background: #f9fafb;
  }
  .wl-card-img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  .wl-card:hover .wl-card-img-wrap img {
    transform: scale(1.05);
  }

  .wl-card-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    opacity: 0;
    transform: scale(0.8);
    z-index: 2;
  }
  .wl-card:hover .wl-card-remove {
    opacity: 1;
    transform: scale(1);
  }
  .wl-card-remove svg {
    width: 14px;
    height: 14px;
    color: #9ca3af;
    transition: color 0.2s;
  }
  .wl-card-remove:hover svg { color: #ef4444; }

  @media (max-width: 768px) {
    .wl-card-remove { opacity: 1; transform: scale(1); }
    .wl-card:hover { transform: none; }
  }

  .wl-badge-oos {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #fef2f2;
    color: #dc2626;
    z-index: 2;
  }

  .wl-card-info { padding: 14px; }
  .wl-card-vendor {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--wl-text-muted);
    margin-bottom: 4px;
    font-weight: 500;
  }
  .wl-card-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .wl-card-title a {
    text-decoration: none;
    color: inherit;
    transition: color 0.2s;
  }
  .wl-card-title a:hover { color: var(--wl-primary); }
  .wl-card-price {
    font-size: 15px;
    font-weight: 700;
    color: var(--wl-text);
    margin-bottom: 10px;
  }
  .wl-card-atc {
    width: 100%;
    padding: 9px 14px;
    border: 1.5px solid var(--wl-text);
    border-radius: 8px;
    background: transparent;
    color: var(--wl-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .wl-card-atc:hover { background: var(--wl-text); color: white; }
  .wl-card-atc:disabled { opacity: 0.4; cursor: not-allowed; }
  .wl-card-atc.added {
    background: #059669;
    border-color: #059669;
    color: white;
    pointer-events: none;
  }

  @media (max-width: 480px) {
    .wl-card-info { padding: 10px; }
    .wl-card-title { font-size: 13px; margin-bottom: 4px; }
    .wl-card-price { font-size: 14px; margin-bottom: 8px; }
    .wl-card-atc { padding: 8px 10px; font-size: 11px; }
    .wl-card-remove { width: 28px; height: 28px; top: 6px; right: 6px; }
    .wl-card-remove svg { width: 12px; height: 12px; }
    .wl-badge-oos { font-size: 9px; padding: 2px 6px; top: 6px; left: 6px; }
  }

  .wl-empty {
    text-align: center;
    padding: 80px 20px;
    grid-column: 1 / -1;
  }
  .wl-empty-icon { width: 72px; height: 72px; margin: 0 auto 20px; color: #d1d5db; }
  .wl-empty h2 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
  .wl-empty p { color: var(--wl-text-muted); font-size: 14px; max-width: 360px; margin: 0 auto 24px; line-height: 1.6; }
  .wl-empty-cta {
    display: inline-flex;
    padding: 12px 28px;
    background: var(--wl-text);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.2s;
  }
  .wl-empty-cta:hover { opacity: 0.85; }

  @media (max-width: 480px) {
    .wl-empty { padding: 60px 16px; }
    .wl-empty-icon { width: 56px; height: 56px; }
    .wl-empty h2 { font-size: 18px; }
    .wl-empty p { font-size: 13px; }
  }

  .wl-loading { grid-column: 1 / -1; text-align: center; padding: 80px 20px; }
  .wl-spinner {
    width: 36px; height: 36px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--wl-primary);
    border-radius: 50%;
    animation: wl-spin 0.7s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes wl-spin { to { transform: rotate(360deg); } }

  .wl-toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: #1f2937;
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    z-index: 1000;
    max-width: 90vw;
    text-align: center;
  }
  .wl-toast.show { transform: translateX(-50%) translateY(0); }

  @media (max-width: 480px) {
    .wl-toast { bottom: 16px; padding: 10px 20px; font-size: 13px; border-radius: 8px; }
  }

  .wl-card.removing { opacity: 0; transform: scale(0.9); transition: all 0.3s ease; }
</style>

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
<div class="wl-toast" id="wl-toast"></div>

<script>  
(function() {
  var shop = {{ shop.permanent_domain | json }};
  var proxyUrl = {{ shop.url | json }} + "/apps/wishlist";
  var customerId = {{ customer.id | json }} || localStorage.getItem("wishlist_guest_id");

  if (!customerId) { showEmpty(); return; }

  fetch(proxyUrl + "/api/products?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var items = data.items || [];
      var s = data.settings || {};

      if (s.gridColumns) document.documentElement.style.setProperty("--wl-columns", s.gridColumns);
      if (s.activeColor) document.documentElement.style.setProperty("--wl-primary", s.activeColor);
      if (s.showShareButton) document.getElementById("wl-share").style.display = "inline-flex";
      if (s.showItemCount !== false) {
        document.getElementById("wl-count").textContent = items.length + " item" + (items.length !== 1 ? "s" : "");
      } else {
        document.getElementById("wl-count").style.display = "none";
      }

      if (items.length === 0) { showEmpty(); return; }

      var html = "";
      items.forEach(function(item) {
        var p = item.product;
        if (!p) return;
        html += '<div class="wl-card" data-product-id="' + item.productId + '">';
        html += '<div class="wl-card-img-wrap">';
        if (p.image) {
          html += '<img src="' + p.image + '&width=600" alt="' + esc(p.imageAlt || p.title) + '" loading="lazy" />';
        } else {
          html += '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
        }
        html += '<button class="wl-card-remove" onclick="window.__wlRemove(\\'' + item.productId + '\\',\\'' + (item.variantId||'') + '\\')" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
        if (!p.available) html += '<span class="wl-badge-oos">Sold Out</span>';
        html += '</div><div class="wl-card-info">';
        if (s.showVendor && p.vendor) html += '<div class="wl-card-vendor">' + esc(p.vendor) + '</div>';
        if (s.showTitle !== false) html += '<div class="wl-card-title"><a href="/products/' + p.handle + '">' + esc(p.title) + '</a></div>';
        if (s.showPrice !== false) html += '<div class="wl-card-price">' + money(p.price, p.currency) + '</div>';
        if (s.showAddToCart !== false) {
          var atcDisabled = !p.available ? ' disabled' : '';
          var varId = item.variantId || '';
          html += '<button class="wl-card-atc"' + atcDisabled + ' onclick="window.__wlAddCart(this,\\'' + item.productId + '\\',\\'' + varId + '\\',\\'' + p.handle + '\\')">' + (p.available ? 'ADD TO CART' : 'SOLD OUT') + '</button>';
        }
        html += '</div></div>';
      });
      document.getElementById("wl-grid").innerHTML = html;
    })
    .catch(function() {
      document.getElementById("wl-grid").innerHTML = '<div class="wl-empty"><p>Could not load your wishlist. Please try again.</p></div>';
    });

  function showEmpty() {
    document.getElementById("wl-count").textContent = "0 items";
    document.getElementById("wl-grid").innerHTML =
      '<div class="wl-empty">' +
        '<svg class="wl-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '<h2>Your wishlist is empty</h2>' +
        '<p>Browse our collection and tap the heart icon on products you love to save them here.</p>' +
        '<a href="/collections/all" class="wl-empty-cta">Start Shopping</a>' +
      '</div>';
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function money(a, c) { return new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD" }).format(parseFloat(a)); }
  function toast(m) { var t = document.getElementById("wl-toast"); t.textContent = m; t.classList.add("show"); setTimeout(function() { t.classList.remove("show"); }, 2500); }

  window.__wlRemove = function(pid, vid) {
    var card = document.querySelector('[data-product-id="' + pid + '"]');
    if (card) card.classList.add("removing");
    fetch(proxyUrl + "/api/wishlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: shop, customerId: customerId, productId: pid, variantId: vid || null, action: "remove" })
    }).then(function() {
      setTimeout(function() {
        if (card) card.remove();
        var rem = document.querySelectorAll(".wl-card").length;
        document.getElementById("wl-count").textContent = rem + " item" + (rem !== 1 ? "s" : "");
        if (rem === 0) showEmpty();
      }, 300);
      toast("Removed from wishlist");
    if (window.__wlWishlistedIds) {
        window.__wlWishlistedIds.delete(pid);
      }
      // Fetch real count from API and update badge
      fetch(proxyUrl + "/api/wishlist?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var count = (data.wishlist && data.wishlist.items) ? data.wishlist.items.length : 0;
          var badge = document.getElementById("wl-hdr-badge");
          if (badge) {
            badge.textContent = count > 99 ? "99+" : count;
            badge.style.display = count > 0 ? "block" : "none";
          }
        });
    });
  };

  window.__wlAddCart = function (btnEl, pid, vid, handle) {
    if (btnEl.disabled) return;

    btnEl.disabled = true;
    btnEl.textContent = "Adding...";

    function getVariantId(callback) {
      if (vid && vid !== "null" && vid !== "undefined" && vid !== "") {
        callback(vid);
        return;
      }

      fetch("/products/" + handle + ".json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.product || !data.product.variants || !data.product.variants.length) {
            throw new Error("No variants");
          }

          var variant = null;
          for (var i = 0; i < data.product.variants.length; i++) {
            if (data.product.variants[i].available) {
              variant = data.product.variants[i];
              break;
            }
          }
          if (!variant) variant = data.product.variants[0];

          callback(variant.id);
        })
        .catch(function () {
          btnEl.disabled = false;
          btnEl.textContent = "ADD TO CART";
        });
    }

    // function syncCartBubble() {
    //   fetch("/cart.js")
    //     .then(function(r) { return r.json(); })
    //     .then(function(cart) {
    //       var count = cart.item_count;
    //       document.querySelectorAll('.cart-count-bubble span').forEach(function(el) {
    //         el.textContent = count;
    //       });
    //       document.querySelectorAll('.cart-count-bubble').forEach(function(el) {
    //         el.style.display = count > 0 ? '' : 'none';
    //       });
    //     })
    //     .catch(function() {});
    // }

    function syncCartBubble() {
  fetch("/cart.js")
    .then(function(r) { return r.json(); })
    .then(function(cart) {
      var count = cart.item_count;
      var existing = document.querySelectorAll('.cart-count-bubble');

      if (existing.length > 0) {
        /* Update existing bubbles */
        existing.forEach(function(el) {
          el.style.display = count > 0 ? '' : 'none';
          var span = el.querySelector('span');
          if (span) span.textContent = count;
        });
      } else if (count > 0) {
        /* Create bubble — Dawn doesn't render it for empty carts */
        var cartIcon = document.getElementById('cart-icon-bubble');
        if (cartIcon) {
          var bubble = document.createElement('div');
          bubble.className = 'cart-count-bubble';
          bubble.innerHTML = '<span aria-hidden="true">' + count + '</span>';
          cartIcon.appendChild(bubble);
        }
      }
    })
    .catch(function() {});
}
    function addToCart(variantId) {
      fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: parseInt(variantId), quantity: 1 }]
        })
      })
      .then(function (res) {
        if (!res.ok) throw new Error("Add failed");
        return res.json();
      })
      .then(function () {

        /* =========================
           REFRESH DRAWER ONLY
        ========================= */

        fetch("/?sections=cart-drawer")
          .then(function(r) { return r.json(); })
          .then(function (drawerData) {

            /* --------- UPDATE DRAWER --------- */
            var drawerWrapper = document.createElement("div");
            drawerWrapper.innerHTML = drawerData["cart-drawer"];

            var newDrawer = drawerWrapper.querySelector("cart-drawer");
            var oldDrawer = document.querySelector("cart-drawer");

            if (newDrawer && oldDrawer) {
              oldDrawer.replaceWith(newDrawer);
            }

            /* --------- SYNC CART BUBBLE --------- */
            syncCartBubble();

            /* --------- OPEN CART DRAWER --------- */
            setTimeout(function () {
              var btn = document.querySelector(
                'a[href="/cart"], [data-cart-toggle], #cart-icon-bubble, button[aria-controls="cart-drawer"]'
              );
              if (btn) btn.click();
            }, 150);

          })
          .catch(function (err) {
            console.error("Drawer refresh error:", err);
            syncCartBubble();
          });

        /* =========================
           THEME EVENTS
        ========================= */

        document.dispatchEvent(new CustomEvent("cart:refresh"));
        document.dispatchEvent(new CustomEvent("cart:updated"));
        window.dispatchEvent(new CustomEvent("cart:updated"));

        /* =========================
           UI FEEDBACK
        ========================= */
window.__wlRemove(pid, vid);
        btnEl.textContent = "Added!";
        btnEl.classList.add("added");
      })
      .catch(function (err) {
        console.error(err);
        btnEl.textContent = "Error";
      })
    .finally(function () {
        setTimeout(function () {
          if (document.contains(btnEl)) {
            btnEl.disabled = false;
            btnEl.textContent = "ADD TO CART";
            btnEl.classList.remove("added");
          }
        }, 1500);
      });
    }

    getVariantId(addToCart);
  };

  window.__wlShare = function() {
    if (navigator.share) navigator.share({ title: "My Wishlist", url: location.href });
    else if (navigator.clipboard) { navigator.clipboard.writeText(location.href); toast("Link copied!"); }
  };
})();
</script>
`;

  return new Response(liquid, {
    headers: { "Content-Type": "application/liquid" },
  });
};