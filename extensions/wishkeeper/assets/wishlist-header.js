(function () {
  function init() {
    var shop = window.__wlHeaderConfig && window.__wlHeaderConfig.shop;
    var proxyUrl = window.__wlHeaderConfig && window.__wlHeaderConfig.proxyUrl;
    var customerId = window.__wlHeaderConfig && window.__wlHeaderConfig.customerId;
    var activeColor = (window.__wlHeaderConfig && window.__wlHeaderConfig.activeColor) || "#e74c6f";
    var iconStyle = (window.__wlHeaderConfig && window.__wlHeaderConfig.iconStyle) || "heart";

    var GUEST_KEY = "wishlist_guest_id";
    if (!customerId) {
      customerId = localStorage.getItem(GUEST_KEY);
      if (!customerId) {
        customerId = "guest_" + crypto.randomUUID();
        localStorage.setItem(GUEST_KEY, customerId);
      }
    }

    var svgPaths = {
      heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
      star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
    };
    var svgPath = svgPaths[iconStyle] || svgPaths.heart;

    function createLink() {
      var link = document.createElement("a");
      link.href = "/apps/wishlist/page";
      link.id = "wl-header-link";
      link.className = "wl-header-icon-link header-actions__action";
      link.setAttribute("aria-label", "Wishlist");
      link.style.cssText = "position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;color:inherit;text-decoration:none;transition:color 0.2s;";
      link.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + svgPath + '</svg>' +
        '<span id="wl-hdr-badge" style="position:absolute;top:2px;right:0;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:' + activeColor + ';color:white;font-size:10px;font-weight:700;line-height:18px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:none;">0</span>';
      return link;
    }

    function insertIcon() {
      if (document.getElementById("wl-header-link")) return true;

      var selectors = [
        ".site-nav__icons",
        "header-actions",
        ".header__column--right",
        "header .header__icons",
        ".header__icons",
        "header .site-header__icons",
        ".site-header__icons",
        ".header-icons",
        ".header__icon-list",
        ".header__utilities",
        ".header__controls",
        "header .utility-bar",
        "amayi-header .header-inner",
      ];

      var container = null;
      for (var i = 0; i < selectors.length; i++) {
        container = document.querySelector(selectors[i]);
        if (container) break;
      }

      if (!container) {
        var cartLink = document.querySelector('header a[href$="/cart"], .header a[href$="/cart"]');
        if (cartLink) container = cartLink.parentElement;
      }

      if (!container) return false;

      var link = createLink();
      var cartEl = container.querySelector('a[href$="/cart"], .action__cart, .header__icon--cart, [data-cart-icon], .cart-toggle, [data-cart-toggle]');
      if (cartEl && cartEl.parentNode === container) {
        container.insertBefore(link, cartEl);
      } else {
        container.appendChild(link);
      }

      // Match Impulse theme icon styles when inserted into .site-nav__icons
      if (container.classList.contains("site-nav__icons")) {
        link.style.cssText = "position:relative;display:inline-block;padding:7.5px 12px;color:inherit;text-decoration:none;vertical-align:middle;";
        link.classList.add("site-nav__link", "site-nav__link--icon");
      }

      return true;
    }

    var inserted = false;

    var observer = new MutationObserver(function () {
      if (!document.getElementById("wl-header-link")) {
        inserted = false;
      }
      if (!inserted) {
        inserted = insertIcon();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    inserted = insertIcon();

    // Keep checking for 60s to handle themes that re-render the header after load
    var retryCount = 0;
    var retryInterval = setInterval(function () {
      if (!document.getElementById("wl-header-link")) {
        inserted = false;
        inserted = insertIcon();
      }
      retryCount++;
      if (retryCount >= 120) clearInterval(retryInterval);
    }, 500);

    // Fetch badge count with localStorage cache
    if (customerId) {
      var cacheKey = "wl_count_" + customerId;
      var cached = localStorage.getItem(cacheKey);

      // Show cached count immediately
      if (cached) {
        var badge = document.getElementById("wl-hdr-badge");
        var cachedCount = parseInt(cached) || 0;
        if (cachedCount > 0 && badge) {
          badge.textContent = cachedCount > 99 ? "99+" : cachedCount;
          badge.style.display = "block";
        }
      }

      // Fetch fresh count in background
      fetch(proxyUrl + "/api/wishlist?shop=" + encodeURIComponent(shop) + "&customerId=" + encodeURIComponent(customerId) + "&action=count")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var badge = document.getElementById("wl-hdr-badge");
          if (badge) {
            var count = data.count || 0;
            localStorage.setItem(cacheKey, count);
            badge.textContent = count > 99 ? "99+" : count;
            badge.style.display = count > 0 ? "block" : "none";
          }
        })
        .catch(function () { });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();