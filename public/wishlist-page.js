(function () {
    var shop = window.__wlPageConfig && window.__wlPageConfig.shop;
    var proxyUrl = window.__wlPageConfig && window.__wlPageConfig.proxyUrl;
    var customerId = window.__wlPageConfig && window.__wlPageConfig.customerId;

    if (!customerId) { showEmpty(); return; }

    // ─── Toast ───────────────────────────────────────────────────────
    function showToast(title, message, imgUrl) {
        var container = document.getElementById("wl-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "wl-toast-container";
            document.body.appendChild(container);
        }
        var t = document.createElement("div");
        t.className = "wl-toast";
        t.innerHTML =
            (imgUrl ? '<img class="wl-toast-img" src="' + imgUrl + '" alt="" />' : '<div class="wl-toast-img-placeholder"></div>') +
            '<div class="wl-toast-body"><div class="wl-toast-title">' + title + '</div><div class="wl-toast-msg">' + message + '</div></div>' +
            '<button class="wl-toast-close">✕</button>';
        container.appendChild(t);
        t.querySelector(".wl-toast-close").addEventListener("click", function () {
            t.classList.remove("show");
            setTimeout(function () { t.remove(); }, 400);
        });
        setTimeout(function () { t.classList.add("show"); }, 10);
        setTimeout(function () { t.classList.remove("show"); setTimeout(function () { t.remove(); }, 400); }, 3000);
    }

    // ─── Load wishlist ────────────────────────────────────────────────
    fetch(proxyUrl + "/api/products?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId))
        .then(function (r) { return r.json(); })
        .then(function (data) {
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
            items.forEach(function (item) {
                var p = item.product;
                if (!p) return;
                html += '<div class="wl-card" data-product-id="' + item.productId + '">';
                html += '<div class="wl-card-img-wrap">';
                if (p.image) {
                    html += '<img src="' + p.image + '&width=600" alt="' + esc(p.imageAlt || p.title) + '" loading="lazy" />';
                } else {
                    html += '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
                }
                html += '<button class="wl-card-remove" onclick="window.__wlRemove(\'' + item.productId + '\',\'' + (item.variantId || '') + '\')" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
                if (!p.available) html += '<span class="wl-badge-oos">Sold Out</span>';
                html += '</div><div class="wl-card-info">';
                if (s.showVendor && p.vendor) html += '<div class="wl-card-vendor">' + esc(p.vendor) + '</div>';
                if (s.showTitle !== false) html += '<div class="wl-card-title"><a href="/products/' + p.handle + '">' + esc(p.title) + '</a></div>';
                if (s.showPrice !== false) html += '<div class="wl-card-price">' + money(p.price, p.currency) + '</div>';
                if (s.showAddToCart !== false) {
                    var atcDisabled = !p.available ? ' disabled' : '';
                    var varId = item.variantId || '';
                    html += '<button class="wl-card-atc"' + atcDisabled + ' onclick="window.__wlAddCart(this,\'' + item.productId + '\',\'' + varId + '\',\'' + p.handle + '\')">' + (p.available ? 'ADD TO CART' : 'SOLD OUT') + '</button>';
                }
                html += '</div></div>';
            });
            document.getElementById("wl-grid").innerHTML = html;
        })
        .catch(function () {
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

    // ─── Remove ───────────────────────────────────────────────────────
    window.__wlRemove = function (pid, vid, fromCart) {
        var card = document.querySelector('[data-product-id="' + pid + '"]');
        var imgEl = card ? card.querySelector("img") : null;
        var titleEl = card ? card.querySelector(".wl-card-title a") : null;
        var imgSrc = imgEl ? imgEl.src : null;
        var title = titleEl ? titleEl.textContent : "Product";

        if (card) card.classList.add("removing");

        fetch(proxyUrl + "/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop: shop, customerId: customerId, productId: pid, variantId: vid || null, action: "remove" })
        }).then(function () {
            setTimeout(function () {
                if (card) card.remove();
                var rem = document.querySelectorAll(".wl-card").length;
                document.getElementById("wl-count").textContent = rem + " item" + (rem !== 1 ? "s" : "");
                if (rem === 0) showEmpty();
            }, 300);

            if (!fromCart) {
                showToast(title, "Removed from Wishlist", imgSrc);
            }

            if (window.__wlWishlistedIds) window.__wlWishlistedIds.delete(pid);

            fetch(proxyUrl + "/api/wishlist?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId))
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var count = (data.wishlist && data.wishlist.items) ? data.wishlist.items.length : 0;
                    var badge = document.getElementById("wl-hdr-badge");
                    if (badge) {
                        badge.textContent = count > 99 ? "99+" : count;
                        badge.style.display = count > 0 ? "block" : "none";
                    }
                });
        });
    };

    // ─── Add to Cart ──────────────────────────────────────────────────
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
                    if (!data || !data.product || !data.product.variants || !data.product.variants.length) throw new Error("No variants");
                    var variant = null;
                    for (var i = 0; i < data.product.variants.length; i++) {
                        if (data.product.variants[i].available) { variant = data.product.variants[i]; break; }
                    }
                    if (!variant) variant = data.product.variants[0];
                    callback(variant.id);
                })
                .catch(function () { btnEl.disabled = false; btnEl.textContent = "ADD TO CART"; });
        }

        function syncCartBubble() {
            fetch("/cart.js")
                .then(function (r) { return r.json(); })
                .then(function (cart) {
                    var count = cart.item_count;
                    var existing = document.querySelectorAll('.cart-count-bubble');
                    if (existing.length > 0) {
                        existing.forEach(function (el) {
                            el.style.display = count > 0 ? '' : 'none';
                            var span = el.querySelector('span');
                            if (span) span.textContent = count;
                        });
                    } else if (count > 0) {
                        var cartIcon = document.getElementById('cart-icon-bubble');
                        if (cartIcon) {
                            var bubble = document.createElement('div');
                            bubble.className = 'cart-count-bubble';
                            bubble.innerHTML = '<span aria-hidden="true">' + count + '</span>';
                            cartIcon.appendChild(bubble);
                        }
                    }
                }).catch(function () { });
        }

        function addToCart(variantId) {
            // Grab card info before removing
            var card = document.querySelector('[data-product-id="' + pid + '"]');
            var imgEl = card ? card.querySelector("img") : null;
            var titleEl = card ? card.querySelector(".wl-card-title a") : null;
            var imgSrc = imgEl ? imgEl.src : null;
            var title = titleEl ? titleEl.textContent : "Product";

            fetch("/cart/add.js", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: [{ id: parseInt(variantId), quantity: 1 }] })
            })
                .then(function (res) { if (!res.ok) throw new Error("Add failed"); return res.json(); })
                .then(function () {
                    fetch("/?sections=cart-drawer")
                        .then(function (r) { return r.json(); })
                        .then(function (drawerData) {
                            var drawerWrapper = document.createElement("div");
                            drawerWrapper.innerHTML = drawerData["cart-drawer"];
                            var newDrawer = drawerWrapper.querySelector("cart-drawer");
                            var oldDrawer = document.querySelector("cart-drawer");
                            if (newDrawer && oldDrawer) oldDrawer.replaceWith(newDrawer);
                            syncCartBubble();
                            setTimeout(function () {
                                var btn = document.querySelector('a[href="/cart"], [data-cart-toggle], #cart-icon-bubble, button[aria-controls="cart-drawer"]');
                                if (btn) btn.click();
                            }, 150);
                        })
                        .catch(function () { syncCartBubble(); });

                    document.dispatchEvent(new CustomEvent("cart:refresh"));
                    document.dispatchEvent(new CustomEvent("cart:updated"));
                    window.dispatchEvent(new CustomEvent("cart:updated"));

                    // Show toast then remove from wishlist
                    showToast(title, "Added to Cart", imgSrc);
                    window.__wlRemove(pid, vid, true);

                    btnEl.textContent = "Added!";
                    btnEl.classList.add("added");
                })
                .catch(function (err) { console.error(err); btnEl.textContent = "Error"; })
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

    // ─── Share ────────────────────────────────────────────────────────
    window.__wlShare = function () {
        if (navigator.share) navigator.share({ title: "My Wishlist", url: location.href });
        else if (navigator.clipboard) { navigator.clipboard.writeText(location.href); }
    };
})();