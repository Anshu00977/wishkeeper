(function () {
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

    var GUEST_KEY = "wishlist_guest_id";

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
          body: JSON.stringify({ shop: shop, customerId: customerId, guestId: guestId, action: "merge" })
        }).then(function () { localStorage.removeItem(GUEST_KEY); });
      }
    }

    function setActive(active) {
      isActive = active;
      btn.classList.toggle("active", active);
      if (textEl) textEl.textContent = active ? "In Wishlist" : "Add to Wishlist";
      btn.setAttribute("aria-label", active ? "Remove from wishlist" : "Add to wishlist");
    }

    // Check initial state
    fetch(proxyUrl + "/api/wishlist?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId) + "&productId=" + encodeURIComponent(productId) + "&action=check")
      .then(function (r) { return r.json(); })
      .then(function (data) { if (data.inWishlist) setActive(true); })
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
          action: action
        })
      })
        .then(function (res) {
          if (!res.ok) setActive(isActive);
          var badge = document.getElementById("wl-hdr-badge");
          if (badge) {
            var current = parseInt(badge.textContent) || 0;
            var newCount = action === "add" ? current + 1 : Math.max(0, current - 1);
            badge.textContent = newCount;
            badge.style.display = newCount > 0 ? "block" : "none";
          }
        })
        .catch(function () { setActive(isActive); })
        .finally(function () { btn.classList.remove("loading"); });
    });
  });
})();