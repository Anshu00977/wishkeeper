(function () {
  var SHOP = window.__wlCollectionConfig && window.__wlCollectionConfig.shop;
  var PROXY = window.__wlCollectionConfig && window.__wlCollectionConfig.proxyUrl;
  var CUSTOMER_ID = window.__wlCollectionConfig && window.__wlCollectionConfig.customerId;
  var ACTIVE_COLOR = (window.__wlCollectionConfig && window.__wlCollectionConfig.activeColor) || "#e74c6f";
  var ICON_STYLE = (window.__wlCollectionConfig && window.__wlCollectionConfig.iconStyle) || "heart";
  var ICON_SIZE = (window.__wlCollectionConfig && window.__wlCollectionConfig.iconSize) || 36;
  var GUEST_KEY = "wishlist_guest_id";

  if (!CUSTOMER_ID) {
    CUSTOMER_ID = localStorage.getItem(GUEST_KEY);
    if (!CUSTOMER_ID) {
      CUSTOMER_ID = "guest_" + crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, CUSTOMER_ID);
    }
  }

  var wishlistedIds = new Set();
  var productIdCache = {};

  var svgPaths = {
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2'
  };
  var iconPath = svgPaths[ICON_STYLE] || svgPaths.heart;

  function findProductCards() {
    var cards = [];
    var linkSelectors = [
      '.product-card a[href*="/products/"]',
      '.card-wrapper a[href*="/products/"]',
      '.grid-product a[href*="/products/"]',
      '.product-item a[href*="/products/"]',
      '.collection-product-card a[href*="/products/"]',
      '.product-card-wrapper a[href*="/products/"]',
      'a.product-card[href*="/products/"]',
      '.card a[href*="/products/"]',
      '.product-thumbnail a[href*="/products/"]',
    ];

    var seenContainers = new Set();

    for (var i = 0; i < linkSelectors.length; i++) {
      var links = document.querySelectorAll(linkSelectors[i]);
      for (var j = 0; j < links.length; j++) {
        var link = links[j];
        var href = link.getAttribute("href") || "";
        var match = href.match(/\/products\/([a-zA-Z0-9_-]+)/);
        if (!match) continue;

        var handle = match[1];
        var container = link.closest('.product-card-wrapper, .card-wrapper, .grid-product, .product-item, .collection-product-card, .product-card, .card, .grid__item, .product-thumbnail');
        if (!container) container = link.parentElement;

        if (seenContainers.has(container)) continue;
        seenContainers.add(container);

        if (container.querySelector('.wl-heart-wrap')) continue;

        var imgWrap = container.querySelector('.card__media, .card__inner, .product-card__image-wrapper, .card-media, .grid-product__image-wrap, .media, .card__image-wrapper, .product-thumbnail-media');
        if (!imgWrap) imgWrap = container.querySelector('img') ? container.querySelector('img').parentElement : null;
        if (!imgWrap) imgWrap = container;

        container.style.position = "relative";
        if (imgWrap !== container) {
          imgWrap.style.position = "relative";
          imgWrap.style.overflow = "visible";
        }

        cards.push({ handle: handle, container: container, imgWrap: imgWrap });
      }
    }
    return cards;
  }

  function fixOverlayLinks() {
    var fullLinks = document.querySelectorAll('a.full-unstyled-link');
    for (var k = 0; k < fullLinks.length; k++) {
      fullLinks[k].style.zIndex = "1";
    }
    var cardLinks = document.querySelectorAll('.card__link');
    for (var l = 0; l < cardLinks.length; l++) {
      cardLinks[l].style.zIndex = "1";
    }
  }

  function getProductId(handle, callback) {
    if (productIdCache[handle]) {
      callback(productIdCache[handle]);
      return;
    }
    fetch("/products/" + handle + ".json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.product && data.product.id) {
          productIdCache[handle] = String(data.product.id);
          callback(String(data.product.id));
        } else {
          callback(null);
        }
      })
      .catch(function () { callback(null); });
  }

  function createHeartButton(productId, isActive) {
    var wrap = document.createElement("div");
    wrap.className = "wl-heart-wrap";
    wrap.style.cssText = "position:absolute;top:8px;right:8px;z-index:99999;pointer-events:auto;isolation:isolate;display:block;";

    var btn = document.createElement("button");
    btn.className = "wl-heart-btn" + (isActive ? " active" : "");
    btn.type = "button";
    btn.setAttribute("aria-label", isActive ? "Remove from wishlist" : "Add to wishlist");
    btn.setAttribute("data-wl-product", productId);
    btn.style.cssText = "width:" + ICON_SIZE + "px;height:" + ICON_SIZE + "px;border:none;background:rgba(255,255,255,0.92);border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.08);padding:0;position:relative;z-index:99999;isolation:isolate;";

    var svgSize = Math.round(ICON_SIZE * 0.5);
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 24 24" fill="' + (isActive ? ACTIVE_COLOR : 'none') + '" stroke="' + (isActive ? ACTIVE_COLOR : '#9ca3af') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="' + iconPath + '"/></svg>';

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn, productId);
      return false;
    };

    wrap.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    wrap.appendChild(btn);
    return wrap;
  }

  function toggleWishlist(btn, productId) {
    var isActive = btn.classList.contains("active");
    var action = isActive ? "remove" : "add";

    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";

    fetch(PROXY + "/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop: SHOP, customerId: CUSTOMER_ID, productId: productId, action: action })
    })
      .then(function (res) {
        if (res.ok) {
          if (action === "add") wishlistedIds.add(productId);
          else wishlistedIds.delete(productId);
          syncButtons(productId, action === "add");
          updateHeaderBadge();
        }
      })
      .catch(function () { })
      .finally(function () {
        btn.style.opacity = "";
        btn.style.pointerEvents = "";
      });
  }

  function syncButtons(productId, isActive) {
    var btns = document.querySelectorAll('[data-wl-product="' + productId + '"]');
    var svgSize = Math.round(ICON_SIZE * 0.5);
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", isActive);
      btns[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 24 24" fill="' + (isActive ? ACTIVE_COLOR : 'none') + '" stroke="' + (isActive ? ACTIVE_COLOR : '#9ca3af') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="' + iconPath + '"/></svg>';
    }
  }

  function updateHeaderBadge() {
    var badge = document.getElementById("wl-hdr-badge");
    if (badge) {
      var count = wishlistedIds.size;
      localStorage.setItem("wl_count_" + CUSTOMER_ID, count);
      badge.textContent = count > 99 ? "99+" : count;
      badge.style.display = count > 0 ? "block" : "none";
    }
  }

  window.__wlWishlistedIds = wishlistedIds;
  window.__wlUpdateHeaderBadge = updateHeaderBadge;

  function init() {
    var cards = findProductCards();
    fixOverlayLinks();

    if (cards.length === 0) return;

    function renderHearts() {
      cards.forEach(function (card) {
        getProductId(card.handle, function (productId) {
          if (productId) {
            var isActive = wishlistedIds.has(productId);
            var heart = createHeartButton(productId, isActive);
            card.container.appendChild(heart);
          }
        });
      });

      updateHeaderBadge();
    }

    fetch(PROXY + "/api/wishlist?shop=" + encodeURIComponent(SHOP) + "&customerId=" + encodeURIComponent(CUSTOMER_ID))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = (data.wishlist && data.wishlist.items) || [];
        items.forEach(function (item) { wishlistedIds.add(item.productId); });
        renderHearts();
      })
      .catch(function () {
        // Still show the hearts (as "not saved") even if the wishlist
        // lookup fails, instead of showing nothing at all.
        renderHearts();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  var observer = new MutationObserver(function (mutations) {
    var hasNew = false;
    mutations.forEach(function (m) { if (m.addedNodes.length > 0) hasNew = true; });
    if (hasNew) {
      clearTimeout(window.__wlObserverTimer);
      window.__wlObserverTimer = setTimeout(init, 500);
    }
  });

  var productGrid = document.querySelector('.collection, .product-grid, #product-grid, .collection-grid, main');
  if (productGrid) observer.observe(productGrid, { childList: true, subtree: true });

})();