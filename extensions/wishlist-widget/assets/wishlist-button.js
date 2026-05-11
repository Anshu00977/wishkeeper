(function () {
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

    // ─── Toast Notification ─────────────────────────────────────────
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

    // ─── Get shop/proxy from first wrapper ──────────────────────────
    var wrapper0 = document.querySelector(".wl-btn-wrapper");
    var shop = wrapper0 ? wrapper0.dataset.shop : null;
    var proxyUrl = wrapper0 ? wrapper0.dataset.proxyUrl : null;

    // ─── Fetch product info for toast ───────────────────────────────
    var productInfoCache = {};

    function getProductInfo(handle, callback) {
        if (productInfoCache[handle]) { callback(productInfoCache[handle]); return; }
        fetch("/products/" + handle + ".json")
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.product) {
                    var info = {
                        title: data.product.title,
                        image: data.product.images && data.product.images[0] ? data.product.images[0].src : null,
                    };
                    productInfoCache[handle] = info;
                    callback(info);
                } else {
                    callback(null);
                }
            })
            .catch(function () { callback(null); });
    }

    // ─── Initialize buttons ──────────────────────────────────────────
    function initButtons(planDisabled) {
        var wrappers = document.querySelectorAll(".wl-btn-wrapper");

        wrappers.forEach(function (wrapper) {
            if (wrapper.dataset.initialized) return;
            wrapper.dataset.initialized = "true";

            var btn = wrapper.querySelector(".wl-btn");
            var textEl = wrapper.querySelector(".wl-btn-text");
            var productId = wrapper.dataset.productId;
            var variantId = wrapper.dataset.variantId;
            var shop = wrapper.dataset.shop;
            var proxyUrl = wrapper.dataset.proxyUrl;
            var customerId = wrapper.dataset.customerId;
            var isActive = false;
            var currentWishlistId = null;

            var GUEST_KEY = "wishlist_guest_id";

            // ─── Disable if no active plan ───────────────────────────────
            if (planDisabled) {
                btn.style.opacity = "0.35";
                btn.style.cursor = "not-allowed";
                btn.style.pointerEvents = "none";
                return;
            }

            function getGuestId() {
                var id = localStorage.getItem(GUEST_KEY);
                if (!id) {
                    id = "guest_" + crypto.randomUUID();
                    localStorage.setItem(GUEST_KEY, id);
                }
                return id;
            }

            if (!customerId) {
                customerId = getGuestId();
            } else {
                var guestId = localStorage.getItem(GUEST_KEY);
                if (guestId) {
                    fetch(proxyUrl + "/api/wishlist", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ shop: shop, customerId: customerId, guestId: guestId, action: "merge" }),
                    }).then(function () { localStorage.removeItem(GUEST_KEY); });
                }
            }

            // Pre-fetch product info for toast
            var productHandle = window.location.pathname.split("/products/")[1];
            if (productHandle) productHandle = productHandle.split("?")[0];
            if (productHandle) getProductInfo(productHandle, function () { });

            function setActive(active) {
                isActive = active;
                btn.classList.toggle("active", active);
                if (textEl) textEl.textContent = active ? "In Wishlist" : "Add to Wishlist";
                btn.setAttribute("aria-label", active ? "Remove from wishlist" : "Add to wishlist");
            }

            // Fetch wishlist to get wishlistId and check state
            fetch(
                proxyUrl +
                "/api/wishlist?shop=" +
                encodeURIComponent(shop) +
                "&customerId=" +
                encodeURIComponent(customerId)
            )
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.wishlist && data.wishlist.id) {
                        currentWishlistId = data.wishlist.id;
                    }
                    var found =
                        data.wishlist &&
                        data.wishlist.items &&
                        data.wishlist.items.some(function (item) {
                            return String(item.productId) === String(productId);
                        });
                    if (found) setActive(true);
                })
                .catch(function () { });

            btn.addEventListener("click", function () {
                btn.classList.add("loading");
                var action = isActive ? "remove" : "add";
                setActive(!isActive);

                fetch(proxyUrl + "/api/wishlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        shop: shop,
                        customerId: customerId,
                        productId: productId,
                        variantId: variantId,
                        wishlistId: currentWishlistId,
                        action: action,
                    }),
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {
                        if (data.error === "limit_reached") {
                            setActive(false);
                            showUpgradeModal();
                            return;
                        }
                        if (data.success) {
                            if (data.item && data.item.wishlistId) {
                                currentWishlistId = data.item.wishlistId;
                            }
                            if (window.__wlWishlistedIds) {
                                if (action === "add") window.__wlWishlistedIds.add(productId);
                                else window.__wlWishlistedIds.delete(productId);
                            }
                            var badge = document.getElementById("wl-hdr-badge");
                            if (badge) {
                                var current = parseInt(badge.textContent) || 0;
                                var newCount = action === "add" ? current + 1 : Math.max(0, current - 1);
                                badge.textContent = newCount > 99 ? "99+" : newCount;
                                badge.style.display = newCount > 0 ? "block" : "none";
                            }
                            // Show toast with product info
                            var handle = window.location.pathname.split("/products/")[1];
                            if (handle) handle = handle.split("?")[0];
                            var info = handle ? productInfoCache[handle] : null;
                            showToast(
                                info ? info.title : "Product",
                                action === "add" ? "Added to Wishlist" : "Removed from Wishlist",
                                info ? info.image : null
                            );
                        } else {
                            setActive(isActive);
                        }
                    })
                    .catch(function () { setActive(isActive); })
                    .finally(function () { btn.classList.remove("loading"); });
            });
        });
    }

    // ─── Check plan then init ────────────────────────────────────────
    if (shop && proxyUrl) {
        fetch(proxyUrl + "/api/wishlist?shop=" + encodeURIComponent(shop) + "&customerId=_&action=plan")
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var planDisabled = !data.plan || data.plan === "none";
                initButtons(planDisabled);
            })
            .catch(function () { initButtons(false); });
    } else {
        initButtons(false);
    }
})();