import { Product, PRODUCTS, PRODUCT_PRICE, PRODUCT_META } from "./products.js";

// ============================================================
// AURA & ESSENCE FRONTEND
// Object-oriented services are defined below so catalog, cart,
// wishlist, API communication, and admin management stay separated.
// ============================================================

const reviewStats = {};

// ============================================================
// OOP CORE SERVICES
// ============================================================

class ProductCatalog {
  constructor(products, meta = {}) {
    this.products = products.map(
      (product) =>
        new Product({
          ...product,
          ...(meta[product.id] || {}),
        }),
    );

    this.meta = meta;
  }

  all() {
    return this.products;
  }

  find(id) {
    return this.products.find((product) => product.id === id);
  }

  upsert(data) {
    const index = this.products.findIndex((product) => product.id === data.id);

    const product = new Product(data);

    if (index === -1) {
      this.products.push(product);
    } else {
      this.products[index] = product;
    }

    return product;
  }

  remove(id) {
    this.products = this.products.filter((product) => product.id !== id);
  }
}

class CartManager {
  constructor(storageKey = "aeCart") {
    this.storageKey = storageKey;

    this.items = JSON.parse(localStorage.getItem(storageKey) || "[]");
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  find(id) {
    return this.items.find((item) => item.id === id);
  }

  clear() {
    this.items = [];
    this.save();
  }

  add(product, qty = 1) {
    if (!product || product.active === false || product.stock === 0) {
      return false;
    }

    const existing = this.find(product.id);

    const nextQty = (existing?.qty || 0) + qty;

    if (product.stock != null && nextQty > Number(product.stock)) {
      return false;
    }

    if (existing) {
      existing.qty = nextQty;
    } else {
      this.items.push({
        id: product.id,
        qty,
      });
    }

    this.save();

    return true;
  }

  change(product, delta) {
    const item = this.find(product?.id);

    if (!item || !product) {
      return;
    }

    item.qty = Math.max(0, item.qty + delta);

    if (product.stock != null) {
      item.qty = Math.min(item.qty, Number(product.stock));
    }

    if (item.qty === 0) {
      this.remove(product.id);
    }

    this.save();
  }

  remove(id) {
    this.items = this.items.filter((item) => item.id !== id);

    this.save();
  }

  total(catalog) {
    return this.items.reduce((sum, item) => {
      const product = catalog.find(item.id);

      return sum + (product ? product.priceValue * item.qty : 0);
    }, 0);
  }
}

class WishlistManager {
  constructor(storageKey = "aeFavorites") {
    this.storageKey = storageKey;

    this.items = JSON.parse(localStorage.getItem(storageKey) || "[]");
  }

  has(id) {
    return this.items.includes(id);
  }

  toggle(id) {
    this.items = this.has(id)
      ? this.items.filter((item) => item !== id)
      : [...this.items, id];

    localStorage.setItem(this.storageKey, JSON.stringify(this.items));

    return this.items;
  }
}

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get(params = {}) {
    const url = new URL(this.baseUrl);

    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );

    const response = await fetch(url, {
      cache: "no-store",
    });

    return response.json();
  }

  async post(params = {}) {
    const response = await fetch(this.baseUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body: new URLSearchParams(params).toString(),
    });

    return response.json();
  }
}

// ============================================================
// GLOBAL SERVICES
// ============================================================

const catalog = new ProductCatalog(PRODUCTS, PRODUCT_META);

const cartManager = new CartManager();

const wishlistManager = new WishlistManager();

let apiClient;

let favorites = wishlistManager.items;

let cart = cartManager.items;

// ============================================================
// BASIC HELPERS
// ============================================================

function getProductById(id) {
  return catalog.find(id);
}

function getCartTotal() {
  return cartManager.total(catalog);
}

function saveCart() {
  cartManager.items = cart;

  cartManager.save();

  renderCart();
}

function addToCart(id, qty = 1) {
  const product = getProductById(id);

  if (!product) {
    return;
  }

  const existing = cartManager.find(id);

  const next = (existing?.qty || 0) + qty;

  if (product.stock != null && next > Number(product.stock)) {
    alert(`Only ${product.stock} bottle(s) of ${product.name} available.`);

    return;
  }

  if (!cartManager.add(product, qty)) {
    return;
  }

  cart = cartManager.items;

  renderCart();
}

function changeCartQty(id, delta) {
  const product = getProductById(id);

  if (!product) {
    return;
  }

  cartManager.change(product, delta);

  cart = cartManager.items;

  renderCart();
}

function removeFromCart(id) {
  cartManager.remove(id);

  cart = cartManager.items;

  renderCart();
}

function renderCart() {
  const wrap = document.getElementById("cartItems");

  const count = document.getElementById("cartCount");

  const total = document.getElementById("cartTotal");

  if (!wrap) {
    return;
  }

  const valid = cart.filter((item) => getProductById(item.id));

  if (valid.length !== cart.length) {
    cart = valid;

    localStorage.setItem("aeCart", JSON.stringify(cart));
  }

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

  count.textContent = `${totalQty} ${totalQty === 1 ? "item" : "items"}`;

  total.textContent = `₱${getCartTotal().toLocaleString()}`;

  if (!cart.length) {
    wrap.innerHTML =
      '<div class="cart-empty">Your cart is empty. Add one or more fragrances above.</div>';

    return;
  }

  wrap.innerHTML = cart
    .map((item) => {
      const p = getProductById(item.id);

      return `
          <div class="cart-item">

            <img
              src="${p.img}"
              alt="${p.name}"
            >

            <div>

              <div class="cart-item-name">
                ${p.name}
              </div>

              <div class="cart-item-price">
                ₱${Number(p.price || PRODUCT_PRICE).toLocaleString()}
                each
              </div>

            </div>

            <div class="cart-controls">

              <button
                type="button"
                data-cart-minus="${p.id}"
              >
                −
              </button>

              <span>
                ${item.qty}
              </span>

              <button
                type="button"
                data-cart-plus="${p.id}"
              >
                +
              </button>

              <button
                type="button"
                class="cart-remove"
                data-cart-remove="${p.id}"
                aria-label="Remove ${p.name}"
              >
                ×
              </button>

            </div>

          </div>
        `;
    })
    .join("");
}

// ============================================================
// CART EVENTS
// ============================================================

document.getElementById("cartItems")?.addEventListener("click", (e) => {
  const minus = e.target.closest("[data-cart-minus]");

  const plus = e.target.closest("[data-cart-plus]");

  const remove = e.target.closest("[data-cart-remove]");

  if (minus) {
    changeCartQty(minus.dataset.cartMinus, -1);
  }

  if (plus) {
    changeCartQty(plus.dataset.cartPlus, 1);
  }

  if (remove) {
    removeFromCart(remove.dataset.cartRemove);
  }
});

document.getElementById("addSelectedToCart")?.addEventListener("click", () => {
  if (scentSelect.value) {
    addToCart(scentSelect.value, 1);
  }
});

// ============================================================
// DOM REFERENCES
// ============================================================

const carousel = document.getElementById("carousel");

const carouselPrev = document.getElementById("carouselPrev");

const carouselNext = document.getElementById("carouselNext");

const scentSelect = document.getElementById("scent");

const tabs = document.querySelectorAll(".tab");

let activeCat = "men";

const productSearch = document.getElementById("productSearch");

const profileFilter = document.getElementById("profileFilter");

const wishlistToggle = document.getElementById("wishlistToggle");

const wishlistPanel = document.getElementById("wishlistPanel");

const wishlistItems = document.getElementById("wishlistItems");

const wishlistEmpty = document.getElementById("wishlistEmpty");

// ============================================================
// PRODUCT FILTER
// ============================================================

function getVisibleProducts(cat) {
  const query = (productSearch?.value || "").trim().toLowerCase();

  const profile = profileFilter?.value || "all";

  return catalog
    .all()
    .filter((p) => {
      if (p.active === false) {
        return false;
      }

      if (p.cat !== cat) {
        return false;
      }

      const meta = PRODUCT_META[p.id] || {};

      const searchable = [
        p.name,
        p.desc,
        ...(p.topNotes || []),
        ...(p.heartNotes || []),
        ...(p.baseNotes || []),
        ...(meta.profiles || []),
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) {
        return false;
      }

      if (profile !== "all" && !(meta.profiles || []).includes(profile)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

// ============================================================
// PRODUCT CAROUSEL
// ============================================================

function renderCarousel(cat) {
  carousel.innerHTML = "";

  const products = getVisibleProducts(cat);

  products.forEach((p) => {
    const card = document.createElement("div");

    card.className = "pcard";

    const meta = PRODUCT_META[p.id] || {};

    const stats = reviewStats[p.id] || {
      avg: 0,
      count: 0,
    };

    const ratingText = stats.count
      ? `★ ${stats.avg.toFixed(1)} <span>(${stats.count})</span>`
      : "No reviews yet";

    const badges = (meta.badges || [])
      .map((b) => `<span class="product-badge">${b}</span>`)
      .join("");

    const saved = favorites.includes(p.id);

    card.innerHTML = `

      <div class="pimg">

        <div class="product-badges">
          ${badges}
        </div>

        <button
          type="button"
          class="wishlist-btn ${saved ? "active" : ""}"
          data-wishlist-id="${p.id}"
          aria-label="${saved ? "Remove" : "Add"} ${p.name} ${
            saved ? "from" : "to"
          } favorites"
        >
          ${saved ? "♥" : "♡"}
        </button>

        <img
          src="${p.img}"
          alt="${p.name}"
          loading="lazy"
        >

      </div>


      <div class="pbody">

        <span class="ptag">
          ${cat === "men" ? "FOR HIM" : "FOR HER"}
        </span>

        <h4>
          ${p.name}
        </h4>

        <p>
          ${p.desc}
        </p>

        <div class="product-rating">
          ${ratingText}
        </div>


        <div class="pfoot">

          <span class="pprice">
            &#8369;${Number(p.price || PRODUCT_PRICE).toLocaleString()}
          </span>


          <div class="pactions">

            <button
              type="button"
              class="pdetails"
              data-details-id="${p.id}"
            >
              Details
            </button>


            <button
              type="button"
              class="porder"
              data-id="${p.id}"
              ${p.stock === 0 ? "disabled" : ""}
            >
              ${p.stock === 0 ? "Sold Out" : "Add"}
            </button>

          </div>

        </div>


        ${
          p.stock !== null && p.stock !== undefined
            ? `
              <span
                class="sold-out"
                style="color:${
                  p.stock === 0 ? "#d98b8b" : "var(--parchment-dim)"
                }"
              >
                ${p.stock === 0 ? "SOLD OUT" : p.stock + " in stock"}
              </span>
            `
            : ""
        }

      </div>
    `;

    carousel.appendChild(card);
  });

  if (!products.length) {
    carousel.innerHTML =
      '<div class="summary-empty" style="min-width:100%">No fragrances match your search or filter.</div>';
  }

  requestAnimationFrame(updateCarouselArrows);
}

// ============================================================
// CAROUSEL CONTROLS
// ============================================================

function updateCarouselArrows() {
  const maxScroll = carousel.scrollWidth - carousel.clientWidth;

  const hasOverflow = maxScroll > 2;

  carouselPrev.disabled = !hasOverflow || carousel.scrollLeft <= 2;

  carouselNext.disabled = !hasOverflow || carousel.scrollLeft >= maxScroll - 2;
}

function scrollCarousel(direction) {
  const card = carousel.querySelector(".pcard");

  const gap = 18;

  const amount = card ? card.getBoundingClientRect().width + gap : 248;

  carousel.scrollBy({
    left: direction * amount,
    behavior: "smooth",
  });
}

// ============================================================
// WISHLIST
// ============================================================

function updateWishlistPanel() {
  wishlistItems.innerHTML = "";

  const savedProducts = catalog.all().filter((p) => favorites.includes(p.id));

  wishlistEmpty.style.display = savedProducts.length ? "none" : "block";

  savedProducts.forEach((p) => {
    const b = document.createElement("button");

    b.type = "button";

    b.className = "wishlist-item";

    b.textContent = p.name;

    b.dataset.wishlistJump = p.id;

    wishlistItems.appendChild(b);
  });
}

function toggleFavorite(id) {
  favorites = wishlistManager.toggle(id);

  updateWishlistPanel();

  renderCarousel(activeCat);
}

carouselPrev.addEventListener("click", () => scrollCarousel(-1));

carouselNext.addEventListener("click", () => scrollCarousel(1));

carousel.addEventListener("scroll", updateCarouselArrows, {
  passive: true,
});

window.addEventListener("resize", updateCarouselArrows);

productSearch.addEventListener("input", () => renderCarousel(activeCat));

profileFilter.addEventListener("change", () => renderCarousel(activeCat));

wishlistToggle.addEventListener("click", () => {
  wishlistPanel.classList.toggle("show");

  updateWishlistPanel();
});

wishlistItems.addEventListener("click", (e) => {
  const b = e.target.closest("[data-wishlist-jump]");

  if (!b) {
    return;
  }

  const p = catalog.find(b.dataset.wishlistJump);

  if (!p) {
    return;
  }

  activeCat = p.cat;

  tabs.forEach((t) =>
    t.classList.toggle("active", t.dataset.cat === activeCat),
  );

  renderCarousel(activeCat);

  document.getElementById("collection").scrollIntoView({
    behavior: "smooth",
  });
});

function renderScentOptions() {
  scentSelect.innerHTML = catalog
    .all()
    .map(
      (p) =>
        `<option value="${p.id}">${p.name} (${
          p.cat === "men" ? "For Him" : "For Her"
        })</option>`,
    )
    .join("");
}

// ============================================================
// FRAGRANCE DETAILS MODAL
// ============================================================

const fragranceModal = document.getElementById("fragranceModal");

const fragranceClose = document.getElementById("fragranceClose");

const fragranceModalTitle = document.getElementById("fragranceModalTitle");

const fragranceModalCategory = document.getElementById(
  "fragranceModalCategory",
);

const fragranceModalDescription = document.getElementById(
  "fragranceModalDescription",
);

const fragranceTopNotes = document.getElementById("fragranceTopNotes");

const fragranceHeartNotes = document.getElementById("fragranceHeartNotes");

const fragranceBaseNotes = document.getElementById("fragranceBaseNotes");

const fragranceApplication = document.getElementById("fragranceApplication");

const fragranceOccasion = document.getElementById("fragranceOccasion");

const fragranceProfileBars = document.getElementById("fragranceProfileBars");

const fragranceDayNight = document.getElementById("fragranceDayNight");

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\'/g, "&#039;");
}

// ============================================================
// STRENGTH NORMALIZATION
//
// Admin:
// Subtle
// Moderate
// Bold
//
// Backward compatibility:
// Light  -> Subtle
// Strong -> Bold
// ============================================================

function normalizeStrength(value) {
  const strength = String(value || "moderate")
    .trim()
    .toLowerCase();

  if (strength === "light") {
    return "subtle";
  }

  if (strength === "strong") {
    return "bold";
  }

  if (["subtle", "moderate", "bold"].includes(strength)) {
    return strength;
  }

  return "moderate";
}

// ============================================================
// OPEN FRAGRANCE DETAILS
//
// IMPORTANT:
// Profiles are now TEXT.
// Only Longevity + Strength use bars.
// ============================================================

function openFragranceDetails(productId) {
  const product = catalog.find(productId);

  if (!product) return;

  // ============================================
  // BASIC PRODUCT INFORMATION
  // ============================================

  fragranceModalTitle.textContent = product.name;

  fragranceModalCategory.textContent =
    product.cat === "men"
      ? "For Him • Extrait de Parfum"
      : "For Her • Extrait de Parfum";

  fragranceModalDescription.textContent =
    product.descLong || product.desc || "";

  fragranceTopNotes.textContent = (product.topNotes || []).join(" • ");

  fragranceHeartNotes.textContent = (product.heartNotes || []).join(" • ");

  fragranceBaseNotes.textContent = (product.baseNotes || []).join(" • ");

  fragranceApplication.textContent = product.application || "";

  fragranceOccasion.textContent = product.occasion
    ? "Best suited for: " + product.occasion
    : "";

  // ============================================
  // ADMIN-MANAGED PROFILE DATA
  // ============================================

  const meta = PRODUCT_META[product.id] || {};

  /*
   * IMPORTANT:
   *
   * profiles comes directly from:
   *
   * Admin
   *   ↓
   * Google Sheet
   *   ↓
   * Apps Script
   *   ↓
   * app.js
   *
   * Example:
   *
   * "Fresh"
   *
   * becomes:
   *
   * ["Fresh"]
   *
   * Example:
   *
   * "Fresh, Woody, Amber"
   *
   * becomes:
   *
   * ["Fresh", "Woody", "Amber"]
   */

  let profiles = Array.isArray(meta.profiles) ? meta.profiles : [];

  // Clean the profile values.
  profiles = profiles.map((profile) => String(profile).trim()).filter(Boolean);

  // ============================================
  // PROFILE DISPLAY
  // ============================================

  const profileHTML = profiles.length
    ? profiles
        .map(
          (profile) => `
          <span class="profile-tag">
            ${escapeText(profile)}
          </span>
        `,
        )
        .join("")
    : `
        <span class="profile-tag">
          No profile listed
        </span>
      `;

  // ============================================
  // LONGEVITY / PROJECTION
  // ============================================

  const longevity = Math.max(1, Math.min(10, Number(meta.longevity) || 7));

  const projection = Math.max(1, Math.min(10, Number(meta.projection) || 7));

  // ============================================
  // STRENGTH
  // ============================================

  let strength = String(meta.strength || "moderate")
    .trim()
    .toLowerCase();

  /*
   * Backward compatibility:
   *
   * Old values:
   * light
   * moderate
   * strong
   *
   * New values:
   * subtle
   * moderate
   * bold
   */

  const strengthMap = {
    light: "Subtle",
    subtle: "Subtle",

    moderate: "Moderate",

    strong: "Bold",
    bold: "Bold",
  };

  strength = strengthMap[strength] || "Moderate";

  // ============================================
  // RENDER PROFILE DETAILS
  // ============================================

  fragranceProfileBars.innerHTML = `

    <div class="profile-section">

      <div class="profile-label">
        Scent Profile
      </div>

      <div class="profile-tags">
        ${profileHTML}
      </div>

    </div>

    <div class="profile-stat">

      <span>Longevity</span>

      <span class="profile-track">
        <span
          class="profile-fill"
          style="width:${longevity * 10}%"
        ></span>
      </span>

      <span>
        ${longevity}/10
      </span>

    </div>

    <div class="profile-stat">

      <span>Projection</span>

      <span class="profile-track">
        <span
          class="profile-fill"
          style="width:${projection * 10}%"
        ></span>
      </span>

      <span>
        ${projection}/10
      </span>

    </div>

    <div class="profile-stat">

      <span>Strength</span>

      <span class="profile-track">
        <span
          class="profile-fill"
          style="width:${
            strength === "Subtle" ? 33 : strength === "Moderate" ? 66 : 100
          }%"
        ></span>
      </span>

      <span>
        ${strength}
      </span>

    </div>

  `;

  // ============================================
  // DAY / NIGHT
  // ============================================

  const time = Array.isArray(meta.time) ? meta.time : [];

  fragranceDayNight.innerHTML = `
    <span>
      ☀ Day ${time.includes("day") ? "✓" : ""}
    </span>

    <span>
      🌙 Night ${time.includes("night") ? "✓" : ""}
    </span>
  `;

  // ============================================
  // OPEN MODAL
  // ============================================

  fragranceModal.classList.add("show");

  fragranceModal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

// ============================================================
// CLOSE FRAGRANCE DETAILS
// ============================================================

function closeFragranceDetails() {
  fragranceModal.classList.remove("show");

  fragranceModal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";
}

fragranceClose.addEventListener("click", closeFragranceDetails);

fragranceModal.addEventListener("click", (e) => {
  if (e.target === fragranceModal) {
    closeFragranceDetails();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && fragranceModal.classList.contains("show")) {
    closeFragranceDetails();
  }
});

// ============================================================
// CATEGORY TABS
// ============================================================

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));

    tab.classList.add("active");

    activeCat = tab.dataset.cat;

    renderCarousel(activeCat);

    requestAnimationFrame(updateCarouselArrows);
  });
});

// ============================================================
// CAROUSEL CLICK EVENTS
// ============================================================

carousel.addEventListener("click", (e) => {
  const wish = e.target.closest(".wishlist-btn");

  if (wish) {
    toggleFavorite(wish.dataset.wishlistId);

    return;
  }

  const detailsBtn = e.target.closest(".pdetails");

  if (detailsBtn) {
    openFragranceDetails(detailsBtn.dataset.detailsId);

    return;
  }

  const btn = e.target.closest(".porder");

  if (!btn || btn.disabled) {
    return;
  }

  addToCart(btn.dataset.id, 1);

  scentSelect.value = btn.dataset.id;

  document.getElementById("order").scrollIntoView({
    behavior: "smooth",
  });
});

// ============================================================
// INITIAL RENDER
// ============================================================

renderScentOptions();

updateWishlistPanel();

renderCarousel(activeCat);

requestAnimationFrame(updateCarouselArrows);

// ============================================================
// GOOGLE SHEETS DATABASE
// ============================================================

const GOOGLE_SHEETS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycby2010iiEHQGK7oIaM96MSTMiVt_a-5Dy8qWdnofO1vUtZInhunaR8UxC61r_KIex7g1w/exec";

apiClient = new ApiClient(GOOGLE_SHEETS_WEB_APP_URL);

// ============================================================
// PRODUCT CATALOG SYNC
// ============================================================

async function loadManagedProducts() {
  if (GOOGLE_SHEETS_WEB_APP_URL.includes("PASTE_YOUR_")) {
    return;
  }

  try {
    const response = await fetch(
      GOOGLE_SHEETS_WEB_APP_URL + "?action=products",
      {
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!result.success || !Array.isArray(result.products)) {
      return;
    }

    result.products.forEach((remote) => {
      const existing = catalog.find(remote.id);

      if (existing) {
        Object.assign(existing, {
          ...existing,
          ...remote,

          img: remote.img || existing.img,

          desc: remote.desc || existing.desc,

          descLong: remote.descLong || existing.descLong,

          topNotes: remote.topNotes?.length
            ? remote.topNotes
            : existing.topNotes,

          heartNotes: remote.heartNotes?.length
            ? remote.heartNotes
            : existing.heartNotes,

          baseNotes: remote.baseNotes?.length
            ? remote.baseNotes
            : existing.baseNotes,

          application: remote.application || existing.application,
        });
      } else {
        catalog.upsert(remote);
      }

      PRODUCT_META[remote.id] = Object.assign(PRODUCT_META[remote.id] || {}, {
        profiles: Array.isArray(remote.profiles)
          ? remote.profiles
          : String(remote.profiles || "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),

        occasion: remote.occasion || "",

        strength: remote.strength || "moderate",

        longevity: Number(remote.longevity) || 7,

        projection: Number(remote.projection) || 7,

        time: Array.isArray(remote.time)
          ? remote.time
          : String(remote.time || "")
              .split(",")
              .map((x) => x.trim().toLowerCase())
              .filter(Boolean),

        badges: Array.isArray(remote.badges)
          ? remote.badges
          : String(remote.badges || "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),

        sortOrder: Number(remote.sortOrder) || 0,
      });
    });

    renderScentOptions();

    renderReviewScentOptions();

    renderCarousel(activeCat);

    renderCart();

    syncQuantity();
  } catch (error) {
    console.warn("Managed catalog unavailable; using built-in catalog.", error);
  }
}

loadManagedProducts();

// ============================================================
// CUSTOMER REVIEWS
// ============================================================

const reviewForm = document.getElementById("reviewForm");

const reviewScent = document.getElementById("reviewScent");

const reviewRating = document.getElementById("reviewRating");

const starButtons = document.querySelectorAll("#starSelect button");

const reviewSubmit = document.getElementById("reviewSubmit");

const reviewStatus = document.getElementById("reviewStatus");

const reviewsCarousel = document.getElementById("reviewsCarousel");

const reviewsLoading = document.getElementById("reviewsLoading");

const reviewsEmpty = document.getElementById("reviewsEmpty");

function renderReviewScentOptions() {
  reviewScent.innerHTML =
    '<option value="">Choose a scent</option>' +
    catalog
      .all()
      .map((p) => `<option value="${p.id}">${p.name}</option>`)
      .join("");
}

function setRating(rating) {
  reviewRating.value = String(rating);

  starButtons.forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.rating) <= rating);
  });
}

starButtons.forEach((btn) => {
  btn.addEventListener("click", () => setRating(Number(btn.dataset.rating)));
});

setRating(5);

renderReviewScentOptions();

function showReviewStatus(message, type) {
  reviewStatus.textContent = message;

  reviewStatus.className = "review-status show " + type;
}

function escapeText(value) {
  return value == null ? "" : String(value);
}

// ============================================================
// RENDER REVIEWS
// ============================================================

function renderReviews(reviews) {
  reviewsLoading.style.display = "none";

  Object.keys(reviewStats).forEach((k) => delete reviewStats[k]);

  (reviews || []).forEach((r) => {
    const p = catalog
      .all()
      .find(
        (x) => x.name.toLowerCase() === String(r.scent || "").toLowerCase(),
      );

    if (!p) {
      return;
    }

    reviewStats[p.id] ||= {
      sum: 0,
      count: 0,
      avg: 0,
    };

    reviewStats[p.id].sum += Number(r.rating) || 0;

    reviewStats[p.id].count += 1;

    reviewStats[p.id].avg = reviewStats[p.id].sum / reviewStats[p.id].count;
  });

  renderCarousel(activeCat);

  reviewsCarousel.innerHTML = "";

  if (!reviews || !reviews.length) {
    reviewsCarousel.style.display = "none";

    reviewsEmpty.style.display = "block";

    return;
  }

  reviewsEmpty.style.display = "none";

  reviewsCarousel.style.display = "flex";

  reviews.forEach((review) => {
    const card = document.createElement("article");

    card.className = "review-card";

    const photo = document.createElement("div");

    photo.className = "review-photo";

    if (review.photoUrl) {
      const img = document.createElement("img");

      img.src = review.photoUrl;

      img.alt = "Customer photo for " + escapeText(review.scent);

      img.loading = "lazy";

      photo.appendChild(img);
    } else {
      photo.classList.add("empty");

      photo.textContent = "CUSTOMER REVIEW";
    }

    const body = document.createElement("div");

    body.className = "review-body";

    const stars = document.createElement("div");

    stars.className = "review-stars";

    const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));

    stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);

    const text = document.createElement("p");

    text.className = "review-text";

    text.textContent = review.review || "";

    const meta = document.createElement("div");

    meta.className = "review-meta";

    const name = document.createElement("span");

    name.className = "review-name";

    name.textContent = review.customerName || review.name || "Customer";

    const scent = document.createElement("span");

    scent.className = "review-scent";

    scent.textContent = (review.scent || "").toUpperCase();

    meta.append(name, scent);

    body.append(stars, text, meta);

    card.append(photo, body);

    reviewsCarousel.appendChild(card);
  });
}

// ============================================================
// LOAD REVIEWS
// ============================================================

function loadReviews() {
  if (GOOGLE_SHEETS_WEB_APP_URL.includes("PASTE_YOUR_")) {
    reviewsLoading.textContent =
      "Connect the Google Apps Script URL to load customer reviews.";

    return;
  }

  const callbackName = "__auraReviews_" + Date.now();

  window[callbackName] = function (data) {
    try {
      if (!data || !data.success) {
        throw new Error(data?.message || "Unable to load reviews.");
      }

      renderReviews(data.reviews || []);
    } catch (err) {
      reviewsLoading.textContent =
        "Customer reviews are temporarily unavailable.";
    } finally {
      cleanup();
    }
  };

  const script = document.createElement("script");

  let finished = false;

  const cleanup = () => {
    if (finished) {
      return;
    }

    finished = true;

    delete window[callbackName];

    script.remove();
  };

  script.src =
    GOOGLE_SHEETS_WEB_APP_URL +
    (GOOGLE_SHEETS_WEB_APP_URL.includes("?") ? "&" : "?") +
    "action=reviews&callback=" +
    encodeURIComponent(callbackName);

  script.onerror = () => {
    reviewsLoading.textContent =
      "Customer reviews are temporarily unavailable.";

    cleanup();
  };

  document.body.appendChild(script);
}

// ============================================================
// COMPRESS REVIEW IMAGE
// ============================================================

function compressReviewImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSide = 1200;

        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(img.width * scale));

        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };

      img.onerror = () =>
        reject(new Error("The selected image could not be read."));

      img.src = reader.result;
    };

    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));

    reader.readAsDataURL(file);
  });
}

// ============================================================
// REVIEW FORM
// ============================================================

reviewForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (GOOGLE_SHEETS_WEB_APP_URL.includes("PASTE_YOUR_")) {
    showReviewStatus("Add your Google Apps Script Web App URL first.", "error");

    return;
  }

  const file = document.getElementById("reviewPhoto").files[0];

  if (!file) {
    showReviewStatus("Please attach a photo with your review.", "error");

    return;
  }

  if (!file.type.startsWith("image/")) {
    showReviewStatus("Please upload an image file.", "error");

    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showReviewStatus("Please choose an image smaller than 5 MB.", "error");

    return;
  }

  reviewSubmit.disabled = true;

  reviewSubmit.textContent = "UPLOADING…";

  showReviewStatus("Preparing your photo and review…", "success");

  try {
    const photoData = await compressReviewImage(file);

    if (photoData.length > 1600000) {
      throw new Error(
        "The photo is still too large after compression. Please choose another image.",
      );
    }

    const selectedScent = catalog.all().find((p) => p.id === reviewScent.value);

    const payload = new URLSearchParams({
      action: "submitReview",

      name: document.getElementById("reviewName").value.trim(),

      scent: selectedScent ? selectedScent.name : reviewScent.value,

      scentId: reviewScent.value,

      rating: reviewRating.value,

      review: document.getElementById("reviewText").value.trim(),

      photo: photoData,
    });

    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body: payload.toString(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Unable to submit review.");
    }

    showReviewStatus(
      "Thank you! Your review was submitted and will appear after approval.",
      "success",
    );

    reviewForm.reset();

    setRating(5);

    renderReviewScentOptions();
  } catch (err) {
    console.error(err);

    showReviewStatus(
      err.message || "Unable to submit your review. Please try again.",
      "error",
    );
  } finally {
    reviewSubmit.disabled = false;

    reviewSubmit.textContent = "SUBMIT REVIEW";
  }
});

loadReviews();

// ============================================================
// FIND YOUR SCENT QUIZ
// ============================================================

const quizAnswers = {};

// ------------------------------------------------------------
// QUIZ OPTION SELECTION
// ------------------------------------------------------------

const quizAnswers = {
  occasion: "",
  profile: [],
  strength: "",
};

document.querySelectorAll(".quiz-options").forEach((group) => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-option");

    if (!btn) return;

    const question = group.dataset.question;

    // =====================================================
    // CHARACTER = MULTI SELECT
    // =====================================================

    if (question === "profile") {
      const value = String(btn.dataset.value || "")
        .trim()
        .toLowerCase();

      if (!Array.isArray(quizAnswers.profile)) {
        quizAnswers.profile = [];
      }

      const index = quizAnswers.profile.indexOf(value);

      // Already selected
      if (index !== -1) {
        quizAnswers.profile.splice(index, 1);

        btn.classList.remove("active");
      }

      // Not selected yet
      else {
        quizAnswers.profile.push(value);

        btn.classList.add("active");
      }

      return;
    }

    // =====================================================
    // OCCASION / STRENGTH = SINGLE SELECT
    // =====================================================

    quizAnswers[question] = btn.dataset.value;

    group.querySelectorAll(".quiz-option").forEach((option) => {
      option.classList.toggle("active", option === btn);
    });
  });
});
// ------------------------------------------------------------
// FIND SCENT
// ------------------------------------------------------------

document.getElementById("findScentBtn").addEventListener("click", () => {
  const selectedProfiles = Array.isArray(quizAnswers.profile)
    ? quizAnswers.profile
    : [];

  const selectedOccasion = quizAnswers.occasion || "";

  const selectedStrength = quizAnswers.strength || "";

  const scores = catalog
    .all()
    .map((product) => {
      const meta = PRODUCT_META[product.id] || {};

      let score = 0;

      // =================================================
      // CHARACTER MATCH
      // =================================================

      const productProfiles = Array.isArray(meta.profiles)
        ? meta.profiles.map((profile) => String(profile).trim().toLowerCase())
        : String(meta.profiles || "")
            .split(",")
            .map((profile) => profile.trim().toLowerCase())
            .filter(Boolean);

      const profileMatch = selectedProfiles.some((profile) =>
        productProfiles.includes(profile),
      );

      if (profileMatch) {
        score += 4;
      }

      // =================================================
      // OCCASION MATCH
      // =================================================

      const productOccasions = Array.isArray(meta.occasion)
        ? meta.occasion
        : String(meta.occasion || "")
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter(Boolean);

      if (
        selectedOccasion &&
        productOccasions.includes(selectedOccasion.toLowerCase())
      ) {
        score += 3;
      }

      // =================================================
      // STRENGTH MATCH
      // =================================================

      if (
        selectedStrength &&
        String(meta.strength || "")
          .trim()
          .toLowerCase() === selectedStrength.trim().toLowerCase()
      ) {
        score += 2;
      }

      return {
        product,
        score,
      };
    })

    .sort((a, b) => b.score - a.score);

  // =====================================================
  // GET RESULT
  // =====================================================

  const winner = scores[0]?.product || catalog.all()[0];

  document.getElementById("quizResultName").textContent = winner.name;

  document.getElementById("quizResultText").textContent =
    winner.desc +
    " Best suited for: " +
    (winner.occasion || "versatile wear") +
    ".";

  document.getElementById("quizResult").classList.add("show");

  document.getElementById("quizOrderBtn").dataset.id = winner.id;
});

// ============================================================
// QUIZ ORDER BUTTON
// ============================================================

document.getElementById("quizOrderBtn").addEventListener("click", (e) => {
  scentSelect.value = e.currentTarget.dataset.id;

  document.getElementById("order").scrollIntoView({
    behavior: "smooth",
  });
});

// ============================================================
// BUILD YOUR DUO
// ============================================================

const duoOne = document.getElementById("duoOne");

const duoTwo = document.getElementById("duoTwo");

const duoTotal = document.getElementById("duoTotal");

[duoOne, duoTwo].forEach((select) => {
  select.innerHTML = catalog
    .all()
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  select.addEventListener(
    "change",
    () =>
      (duoTotal.textContent = `2 bottles • ₱${(
        PRODUCT_PRICE * 2
      ).toLocaleString()}`),
  );
});

document.getElementById("duoOrderBtn").addEventListener("click", () => {
  const names = [duoOne.value, duoTwo.value];

  scentSelect.value = names[0];

  document.getElementById("qtyNumber").value = 2;

  syncQuantity();

  document.getElementById("notes").value =
    "Duo: " + names.map((id) => catalog.find(id)?.name || id).join(" + ");

  document.getElementById("order").scrollIntoView({
    behavior: "smooth",
  });
});

// ============================================================
// ORDER FORM
// ============================================================

const form = document.getElementById("orderForm");

const summaryEmpty = document.getElementById("summaryEmpty");

const summaryLines = document.getElementById("summaryLines");

const summaryActions = document.getElementById("summaryActions");

const copyBtn = document.getElementById("copyBtn");

const qtyNumber = document.getElementById("qtyNumber");

const qtyHidden = document.getElementById("qty");

const liveTotal = document.getElementById("liveTotal");

// ============================================================
// QUANTITY
// ============================================================

function syncQuantity() {
  let n = Math.max(1, Math.min(10, parseInt(qtyNumber.value || "1", 10)));

  qtyNumber.value = n;

  qtyHidden.value = n + (n === 1 ? " bottle" : " bottles");

  const selectedId = scentSelect.value;

  const p = getProductById(selectedId);

  liveTotal.textContent =
    "Estimated total: ₱" +
    (
      (p ? Number(p.price || PRODUCT_PRICE) : PRODUCT_PRICE) * n
    ).toLocaleString();

  return n;
}

document.getElementById("qtyMinus").addEventListener("click", () => {
  qtyNumber.value = Number(qtyNumber.value || 1) - 1;

  syncQuantity();
});

document.getElementById("qtyPlus").addEventListener("click", () => {
  qtyNumber.value = Number(qtyNumber.value || 1) + 1;

  syncQuantity();
});

qtyNumber.addEventListener("input", syncQuantity);

scentSelect.addEventListener("change", syncQuantity);

syncQuantity();

renderCart();

// ============================================================
// SUBMIT STATUS
// ============================================================

function showSubmitStatus(message, type) {
  const status = document.getElementById("submitStatus");

  status.textContent = message;

  status.className = "submit-status show " + type;
}

// ============================================================
// ORDER SUBMISSION
// ============================================================

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");

  const data = new FormData(form);

  if (!cart.length) {
    showSubmitStatus(
      "Please add at least one fragrance to your cart.",
      "error",
    );

    return;
  }

  const quantityNumber = cart.reduce((sum, item) => sum + item.qty, 0);

  const orderTotal = getCartTotal();

  const scentName = cart
    .map((item) => getProductById(item.id)?.name || item.id)
    .join(", ");

  const cartLines = cart
    .map((item) => {
      const p = getProductById(item.id);

      return `
              ${p.name} × ${item.qty} — ₱${(
                Number(p.price || PRODUCT_PRICE) * item.qty
              ).toLocaleString()}
            `;
    })
    .join("\n");

  const lines = [
    "AURA & ESSENCE — Order",

    "—————————————",

    "Name: " + data.get("fullname"),

    "Contact: " + data.get("contact"),

    "Items:",

    cartLines,

    "Location: " + data.get("address"),

    "Payment: " + data.get("payment"),

    "Notes: " + (data.get("notes") || "—"),

    "—————————————",

    "Total items: " + quantityNumber,

    "Estimated total: ₱" + orderTotal.toLocaleString(),
  ].join("\n");

  summaryLines.textContent = lines;

  summaryEmpty.style.display = "none";

  summaryLines.style.display = "block";

  summaryActions.style.display = "flex";

  if (GOOGLE_SHEETS_WEB_APP_URL.includes("PASTE_YOUR_")) {
    showSubmitStatus(
      "Order summary created, but the Google Sheets database is not connected yet. Add your Apps Script Web App URL in the code.",
      "error",
    );

    summaryLines.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    return;
  }

  submitBtn.disabled = true;

  submitBtn.textContent = "Saving Order…";

  showSubmitStatus("Saving your order securely…", "success");

  try {
    const payload = new URLSearchParams({
      fullname: data.get("fullname") || "",

      contact: data.get("contact") || "",

      scent: scentName,

      scentId: cart.map((item) => item.id).join(","),

      qty: quantityNumber + (quantityNumber === 1 ? " bottle" : " bottles"),

      items: JSON.stringify(
        cart.map((item) => ({
          id: item.id,

          name: getProductById(item.id)?.name || item.id,

          qty: item.qty,
        })),
      ),

      address: data.get("address") || "",

      payment: data.get("payment") || "",

      notes: data.get("notes") || "",

      price: "430",

      total: String(orderTotal),
    });

    const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },

      body: payload.toString(),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Unable to save the order.");
    }

    showSubmitStatus(
      "Order saved successfully. We received your order and will contact you soon.",
      "success",
    );

    document.getElementById("confirmationOrderId").textContent =
      result.orderId || "ORDER RECEIVED";

    document.getElementById("confirmationMessage").textContent = `Thank you, ${
      data.get("fullname") || "customer"
    }. Your order has been received. We will contact you regarding confirmation and delivery or meetup details.`;

    document.getElementById("confirmationModal").classList.add("show");

    document
      .getElementById("confirmationModal")
      .setAttribute("aria-hidden", "false");

    form.reset();

    qtyNumber.value = 1;

    cart = [];

    localStorage.removeItem("aeCart");

    syncQuantity();

    renderCart();

    renderScentOptions();
  } catch (err) {
    console.error(err);

    showSubmitStatus(
      "The order summary was created, but saving to the database failed. Please try again or contact us directly.",
      "error",
    );
  } finally {
    submitBtn.disabled = false;

    submitBtn.textContent = "Submit Order";
  }

  summaryLines.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
});

// ============================================================
// ORDER CONFIRMATION MODAL
// ============================================================

const confirmationModal = document.getElementById("confirmationModal");

document
  .getElementById("confirmationCloseBtn")
  .addEventListener("click", () => {
    confirmationModal.classList.remove("show");

    confirmationModal.setAttribute("aria-hidden", "true");
  });

document
  .getElementById("confirmationTrackBtn")
  .addEventListener("click", () => {
    const id = document
      .getElementById("confirmationOrderId")
      .textContent.trim();

    document.getElementById("trackingOrderId").value = id;

    confirmationModal.classList.remove("show");

    document.getElementById("tracking").scrollIntoView({
      behavior: "smooth",
    });
  });

confirmationModal.addEventListener("click", (e) => {
  if (e.target === confirmationModal) {
    document.getElementById("confirmationCloseBtn").click();
  }
});

// ============================================================
// ORDER TRACKING
// ============================================================

const trackingResult = document.getElementById("trackingResult");

const trackingStatus = document.getElementById("trackingStatus");

const trackingResultId = document.getElementById("trackingResultId");

const trackingResultSummary = document.getElementById("trackingResultSummary");

const trackSteps = [
  "New",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Completed",
];

function renderTracking(data) {
  const status = data.status || "New";

  const current = Math.max(
    0,
    trackSteps.findIndex((x) => x.toLowerCase() === status.toLowerCase()),
  );

  trackingResultId.textContent = data.orderId || "ORDER";

  trackingResultSummary.innerHTML = `
      <p
        style="
          color:var(--parchment-dim);
          font-size:12px;
          line-height:1.6;
          margin:12px 0
        "
      >
        ${data.scent || "Order"}
        •
        ${data.qty || ""}
        • ₱${Number(data.total || 0).toLocaleString()}

        <br>

        Customer:
        ${data.fullname || ""}
      </p>
    `;

  trackingStatus.innerHTML = trackSteps
    .map(
      (step, i) =>
        `
            <div
              class="track-step ${
                i < current ? "done" : i === current ? "current" : ""
              }"
            >
              ${i < current ? "✓ " : i === current ? "● " : "○ "}

              ${step}

            </div>
          `,
    )
    .join("");

  trackingResult.classList.add("show");
}

function showTrackingError(msg) {
  trackingResult.classList.add("show");

  trackingResultId.textContent = "NOT FOUND";

  trackingResultSummary.innerHTML = `
      <p
        style="
          color:#e8b0b0
        "
      >
        ${msg}
      </p>
    `;

  trackingStatus.innerHTML = "";
}

document.getElementById("trackOrderBtn").addEventListener("click", () => {
  const orderId = document.getElementById("trackingOrderId").value.trim();

  const contact = document.getElementById("trackingContact").value.trim();

  if (!orderId || !contact) {
    showTrackingError("Please enter both your Order ID and contact number.");

    return;
  }

  const callbackName = "__aeTrack_" + Date.now();

  window[callbackName] = (data) => {
    try {
      if (!data?.success) {
        throw new Error(data?.message || "Order not found.");
      }

      renderTracking(data);
    } catch (e) {
      showTrackingError(e.message || "Order not found.");
    } finally {
      delete window[callbackName];

      script.remove();
    }
  };

  const script = document.createElement("script");

  script.src =
    GOOGLE_SHEETS_WEB_APP_URL +
    (GOOGLE_SHEETS_WEB_APP_URL.includes("?") ? "&" : "?") +
    "action=trackOrder" +
    "&orderId=" +
    encodeURIComponent(orderId) +
    "&contact=" +
    encodeURIComponent(contact) +
    "&callback=" +
    encodeURIComponent(callbackName);

  script.onerror = () => {
    showTrackingError("The tracking service is temporarily unavailable.");

    delete window[callbackName];

    script.remove();
  };

  document.body.appendChild(script);
});

// ============================================================
// COPY ORDER SUMMARY
// ============================================================

copyBtn.addEventListener("click", async function () {
  try {
    await navigator.clipboard.writeText(summaryLines.textContent);

    copyBtn.textContent = "Copied!";

    setTimeout(() => {
      copyBtn.textContent = "Copy Order Summary";
    }, 1800);
  } catch (err) {
    copyBtn.textContent = "Select the text above to copy";
  }
});
