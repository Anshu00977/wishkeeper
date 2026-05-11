(function () {
    var config = window.__wlCollectionConfig || {};
    var SHOP = config.shop;
    var PROXY = config.proxy;
    var CUSTOMER_ID = config.customerId || localStorage.getItem("wishlist_guest_id");
    var GUEST_KEY = "wishlist_guest_id";
    var activeColor = config.activeColor;
    var iconSize = config.iconSize;
    var iconStyle = config.iconStyle;

    // ─── Upgrade Modal ───────────────────────────────────────────────
    var upgradeModal = document.getElementById("wl-upgrade-modal");
    var upgradeOverlay = document.getElementById("wl-upgrade-overlay");
    var upgradeClose = document.getElementById("wl-upgrade-close");

    function showUpgradeModal() {
        upgradeModal.classList.add("open");
    }

    function hideUpgradeModal() {
        upgradeModal.classList.remove("open");
    }

    if (upgradeOverlay) upgradeOverlay.addEventListener("click", hideUpgradeModal);
    if (upgradeClose) upgradeClose.addEventListener("click", hideUpgradeModal);

    // ─── Toast Notification ──────────────────────────────────────────
    function showToast(title, message, imgUrl) {
        var container = document.getElementById("wl-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "wl-toast-container";
            document.body.appendChild(container);
        }

        var toast = document.createElement("div");
        toast.className = "wl-toast";
        toast.innerHTML =
            (imgUrl
                ? '<img class="wl-toast-img" src="' + imgUrl + '" alt="" />'
                : '<div class="wl-toast-img-placeholder"></div>') +
            '<div class="wl-toast-body">' +
            '<div class="wl-toast-title">' + title + '</div>' +
            '<div class="wl-toast-msg">' + message + '</div>' +
            '</div>' +
            '<button class="wl-toast-close">✕</button>';

        container.appendChild(toast);

        toast.querySelector(".wl-toast-close").addEventListener("click", function () {
            toast.classList.remove("show");
            setTimeout(function () { toast.remove(); }, 400);
        });

        setTimeout(function () { toast.classList.add("show"); }, 10);
        setTimeout(function () {
            toast.classList.remove("show");
            setTimeout(function () { toast.remove(); }, 400);
        }, 3000);
    }

    // Generate guest ID if needed
    if (!CUSTOMER_ID) {
        CUSTOMER_ID = "guest_" + crypto.randomUUID();
        localStorage.setItem(GUEST_KEY, CUSTOMER_ID);
    }

    // Cache of wishlisted product IDs and product info
    var wishlistedIds = new Set();
    var productInfoCache = {};

    // SVG paths for icon styles
    var svgPaths = {
        heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
        bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
        star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2",
    };
    var iconPath = svgPaths[iconStyle] || svgPaths.heart;
    var iconTag = iconStyle === "star" ? "polygon" : "path";
    var iconAttr = iconStyle === "star" ? "points" : "d";

    // ─── Find all product cards ────────────────────────────────────────

    function findProductCards() {
        var cards = [];
        var linkSelectors = [
            ".product-card a[href*=\"/products/\"]",
            ".card-wrapper a[href*=\"/products/\"]",
            ".grid-product a[href*=\"/products/\"]",
            ".product-item a[href*=\"/products/\"]",
            ".collection-product-card a[href*=\"/products/\"]",
            ".product-card-wrapper a[href*=\"/products/\"]",
            "a.product-card[href*=\"/products/\"]",
            "a.card--product[href*=\"/products/\"]",
            ".card a[href*=\"/products/\"]",
        ];

        for (var i = 0; i < linkSelectors.length; i++) {
            var links = document.querySelectorAll(linkSelectors[i]);
            for (var j = 0; j < links.length; j++) {
                var link = links[j];
                var href = link.getAttribute("href") || "";
                var match = href.match(/\/products\/([a-zA-Z0-9_-]+)/);
                if (!match) continue;

                var handle = match[1];
                var container = link.closest(
                    ".product-card-wrapper, .card-wrapper, .grid-product, .product-item, .collection-product-card, .product-card, .card--product, .card, .grid__item"
                );
                if (!container) container = link.parentElement;

                if (container.getAttribute("data-wl-processed")) continue;

                var imgWrap = container.querySelector(
                    ".card__media, .card__inner, .product-card__image-wrapper, .card-media, .grid-product__image-wrap, .product-card__image, .media, .card__image-wrapper"
                );
                if (!imgWrap) imgWrap = container.querySelector("img")?.parentElement;
                if (!imgWrap) imgWrap = container;

                // Get product title from card for toast
                var titleEl = container.querySelector(".card__heading, .product-card__title, .grid-product__title, h3, h2");
                var title = titleEl ? titleEl.textContent.trim() : handle;

                // Get product image from card for toast
                var imgEl = container.querySelector("img");
                var imgSrc = imgEl ? (imgEl.src || imgEl.dataset.src || "") : "";

                container.setAttribute("data-wl-processed", handle);
                container.style.position = "relative";
                if (imgWrap !== container) imgWrap.style.position = "relative";

                cards.push({ handle: handle, container: container, imgWrap: imgWrap, title: title, imgSrc: imgSrc });
            }
        }

        return cards;
    }

    // ─── Fetch product ID from handle ────────────────────────────────

    function getProductId(handle, callback) {
        fetch("/products/" + handle + ".json")
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.product && data.product.id) {
                    // Cache product info for toast
                    productInfoCache[String(data.product.id)] = {
                        title: data.product.title,
                        image: data.product.images && data.product.images[0] ? data.product.images[0].src : null,
                    };
                    callback(String(data.product.id));
                } else {
                    callback(null);
                }
            })
            .catch(function () { callback(null); });
    }

    // ─── Create heart button ──────────────────────────────────────────

    function createHeartButton(productId, isActive, planDisabled) {
        var wrap = document.createElement("div");
        wrap.className = "wl-heart-wrap";

        var btn = document.createElement("button");
        btn.className = "wl-heart-btn" + (isActive ? " active" : "");
        btn.type = "button";
        btn.style.width = iconSize + "px";
        btn.style.height = iconSize + "px";
        btn.setAttribute("aria-label", isActive ? "Remove from wishlist" : "Add to wishlist");
        btn.setAttribute("data-wl-product", productId);
        btn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;width:' +
            iconSize * 0.5 +
            "px;height:" +
            iconSize * 0.5 +
            'px"><' +
            iconTag +
            " " +
            iconAttr +
            '="' +
            iconPath +
            '"/></svg>';

        var styleEl = document.createElement("style");
        styleEl.textContent =
            ".wl-heart-btn.active svg { color: " + activeColor + "; fill: " + activeColor + "; }";
        if (!document.getElementById("wl-active-color-style")) {
            styleEl.id = "wl-active-color-style";
            document.head.appendChild(styleEl);
        }

        if (planDisabled) {
            btn.style.opacity = "0.35";
            btn.style.cursor = "not-allowed";
            btn.style.pointerEvents = "none";
            wrap.appendChild(btn);
            return wrap;
        }

        function stop(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        btn.addEventListener("click", function (e) { stop(e); toggleWishlist(btn, productId); }, true);
        btn.addEventListener("mousedown", stop, true);
        btn.addEventListener("mouseup", stop, true);
        btn.addEventListener("touchstart", stop, { passive: false, capture: true });
        btn.addEventListener("touchend", function (e) { stop(e); toggleWishlist(btn, productId); }, { passive: false, capture: true });

        wrap.addEventListener("click", stop, false);
        wrap.addEventListener("mousedown", stop, false);
        wrap.addEventListener("touchstart", stop, { passive: false, capture: false });

        wrap.appendChild(btn);
        return wrap;
    }

    // ─── Toggle wishlist ──────────────────────────────────────────────

    function toggleWishlist(btn, productId) {
        console.log("TOGGLE CALLED", productId);
        var isActive = btn.classList.contains("active");
        var action = isActive ? "remove" : "add";

        btn.classList.add("loading");
        btn.classList.toggle("active");
        btn.setAttribute("aria-label", !isActive ? "Remove from wishlist" : "Add to wishlist");

        fetch(PROXY + "/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                shop: SHOP,
                customerId: CUSTOMER_ID,
                productId: productId,
                wishlistId: window.__wlWishlistId || null,
                action: action,
            }),
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.error === "limit_reached") {
                    btn.classList.toggle("active");
                    btn.setAttribute("aria-label", "Add to wishlist");
                    showUpgradeModal();
                    return;
                }
                if (data.success) {
                    if (action === "add") wishlistedIds.add(productId);
                    else wishlistedIds.delete(productId);
                    updateHeaderBadge();
                    syncButtons(productId, action === "add");

                    // Show toast
                    // Show toast
                    var info = productInfoCache[productId] || {};
                    console.log("toast info:", info, "productId:", productId, "cache:", productInfoCache);
                    showToast(
                        info.title || "Product",
                        action === "add" ? "Added to Wishlist" : "Removed from Wishlist",
                        info.image || null
                    );
                } else {
                    btn.classList.toggle("active");
                }
            })
            .catch(function () { btn.classList.toggle("active"); })
            .finally(function () { btn.classList.remove("loading"); });
    }

    // ─── Sync all buttons for same product ───────────────────────────

    function syncButtons(productId, isActive) {
        var btns = document.querySelectorAll('[data-wl-product="' + productId + '"]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle("active", isActive);
        }
    }

    // ─── Update header badge ──────────────────────────────────────────

    function updateHeaderBadge() {
        var badge = document.getElementById("wl-hdr-badge");
        if (badge) {
            var count = wishlistedIds.size;
            badge.textContent = count > 99 ? "99+" : count;
            badge.style.display = count > 0 ? "block" : "none";
        }
    }

    window.__wlUpdateHeaderBadge = updateHeaderBadge;
    window.__wlWishlistedIds = wishlistedIds;

    // ─── Initialize ───────────────────────────────────────────────────

    function init(planDisabled) {
        var cards = findProductCards();
        if (cards.length === 0) return;

        if (planDisabled) {
            cards.forEach(function (card) {
                getProductId(card.handle, function (productId) {
                    if (productId) {
                        var heart = createHeartButton(productId, false, true);
                        card.imgWrap.appendChild(heart);
                    }
                });
            });
            return;
        }

        fetch(PROXY + "/api/wishlist?shop=" + encodeURIComponent(SHOP) + "&customerId=" + encodeURIComponent(CUSTOMER_ID))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var items = (data.wishlist && data.wishlist.items) || [];
                window.__wlWishlistId = data.wishlist && data.wishlist.id ? data.wishlist.id : null;
                items.forEach(function (item) { wishlistedIds.add(item.productId); });

                cards.forEach(function (card) {
                    getProductId(card.handle, function (productId) {
                        if (productId) {
                            var isActive = wishlistedIds.has(productId);
                            var heart = createHeartButton(productId, isActive, false);
                            card.imgWrap.appendChild(heart);
                        }
                    });
                });

                updateHeaderBadge();
            })
            .catch(function () { });
    }

    // ─── Check plan then init ────────────────────────────────────────

    function start() {
        fetch(PROXY + "/api/wishlist?shop=" + encodeURIComponent(SHOP) + "&customerId=_&action=plan")
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var planDisabled = !data.plan || data.plan === "none";
                init(planDisabled);
            })
            .catch(function () { init(false); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    var observer = new MutationObserver(function (mutations) {
        var hasNew = false;
        mutations.forEach(function (m) { if (m.addedNodes.length > 0) hasNew = true; });
        if (hasNew) {
            clearTimeout(window.__wlObserverTimer);
            window.__wlObserverTimer = setTimeout(function () { start(); }, 500);
        }
    });

    var productGrid = document.querySelector(".collection, .product-grid, #product-grid, main");
    if (productGrid) observer.observe(productGrid, { childList: true, subtree: true });

    // ─── Remove from wishlist on add to cart ─────────────────────────

    function removeFromWishlistOnCart(productId) {
        var info = productInfoCache[productId] || {};
        fetch(PROXY + "/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop: SHOP, customerId: CUSTOMER_ID, productId: productId, action: "remove" }),
        }).then(function () {
            wishlistedIds.delete(productId);
            syncButtons(productId, false);
            updateHeaderBadge();
            showToast(info.title || "Product", "Removed from Wishlist", info.image || null);
        }).catch(function () { });
    }

    var originalFetch = window.fetch;
    window.fetch = function (url, options) {
        if (url && (url.toString().includes("/cart/add.js") || url.toString().includes("/cart/add"))) {
            try {
                var body = JSON.parse(options && options.body);
                var variantId = body.id || body.items?.[0]?.id;
                if (variantId) {
                    fetch("/variants/" + variantId + ".json")
                        .then(function (r) { return r.json(); })
                        .then(function (data) {
                            var pid = data?.product_variant?.product_id ? String(data.product_variant.product_id) : null;
                            if (pid) removeFromWishlistOnCart(pid);
                        });
                }
            } catch (e) { }
        }
        return originalFetch.apply(this, arguments);
    };

    document.addEventListener("submit", function (e) {
        var form = e.target;
        if (!form || !form.action || !form.action.includes("/cart/add")) return;
        var variantInput = form.querySelector('[name="id"]');
        if (!variantInput) return;
        fetch("/variants/" + variantInput.value + ".json")
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var pid = String(data?.variant?.product_id);
                if (pid) removeFromWishlistOnCart(pid);
            });
    }, true);
})();