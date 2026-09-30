// app.js
// SAFE OPTIMIZED VERSION
// - Preserves original ProductCatalog logic
// - Preserves p.cat category field
// - GET requests: retry + timeout
// - POST requests: timeout, no automatic retry
// - Product images: lazy + async decoding
// - Search: 120ms debounce
// - Safer localStorage parsing

import { Product, PRODUCTS, PRODUCT_PRICE, PRODUCT_META } from "./products.js";

/* =========================================================
   CART MANAGER
========================================================= */

class CartManager {
  constructor(storageKey = "auraEssenceCart") {
    this.storageKey = storageKey;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      this.items = Array.isArray(saved) ? saved : [];
    } catch {
      this.items = [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  add(product, quantity = 1) {
    const existing = this.items.find(item => item.id === product.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price || PRODUCT_PRICE || 430),
        img: product.img,
        quantity
      });
    }

    this.save();
  }

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  }

  updateQuantity(id, quantity) {
    const item = this.items.find(item => item.id === id);

    if (!item) return;

    quantity = Math.max(1, Number(quantity) || 1);
    item.quantity = quantity;

    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }

  count() {
    return this.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  total() {
    return this.items.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }

  all() {
    return this.items;
  }
}


/* =========================================================
   PRODUCT CATALOG
   DO NOT CHANGE THIS STRUCTURE
========================================================= */

class ProductCatalog {
  constructor(products, meta = {}) {
    this.products = products.map(product => new Product({
      ...product,
      ...(meta[product.id] || {})
    }));

    this.meta = meta;
  }

  all() {
    return this.products;
  }

  find(id) {
    return this.products.find(product => product.id === id);
  }

  upsert(data) {
    const index = this.products.findIndex(
      product => product.id === data.id
    );

    const product = new Product(data);

    if (index === -1) {
      this.products.push(product);
    } else {
      this.products[index] = product;
    }

    return product;
  }

  remove(id) {
    this.products = this.products.filter(
      product => product.id !== id
    );
  }
}


/* =========================================================
   API CLIENT
========================================================= */

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get(params = {}) {
    const query = new URLSearchParams(params);

    // Cache buster prevents stale Apps Script responses
    query.set("_ts", Date.now().toString());

    const url = `${this.baseUrl}?${query.toString()}`;

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      try {
        const response = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          cache: "no-store"
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

      } catch (error) {
        clearTimeout(timeout);

        if (attempt >= maxAttempts) {
          throw error;
        }

        // 400ms, then 800ms
        await new Promise(resolve =>
          setTimeout(resolve, 400 * attempt)
        );
      }
    }
  }

  async post(data = {}) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams(data)
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
}


/* =========================================================
   API CONFIG
========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycby2010iiEHQGK7oIaM96MSTMiVt_a-5Dy8qWdnofO1vUtZInhunaR8UxC61r_KIex7g1w/exec";

const api = new ApiClient(API_URL);


/* =========================================================
   GLOBAL STATE
========================================================= */

const catalog = new ProductCatalog(PRODUCTS, PRODUCT_META);

const cart = new CartManager("auraEssenceCart");

let activeCat = "men";

let activeProduct = null;

let searchRenderTimer;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const productSearch =
  document.querySelector("#productSearch");

const profileFilter =
  document.querySelector("#profileFilter");

const carousel =
  document.querySelector("#productCarousel");

const cartCount =
  document.querySelector("#cartCount");

const wishlistCount =
  document.querySelector("#wishlistCount");


/* =========================================================
   VISIBLE PRODUCTS
   IMPORTANT:
   ACTUAL CATEGORY FIELD IS p.cat
========================================================= */

function getVisibleProducts(cat) {
  const query =
    (productSearch?.value || "")
      .trim()
      .toLowerCase();

  const profile =
    profileFilter?.value || "all";

  return catalog
    .all()
    .filter((p) => {

      if (p.active === false) {
        return false;
      }

      // IMPORTANT: product category uses p.cat
      if (p.cat !== cat) {
        return false;
      }

      const meta =
        PRODUCT_META[p.id] || {};

      const searchable = [
        p.name,
        p.desc,
        ...(p.topNotes || []),
        ...(p.heartNotes || []),
        ...(p.baseNotes || []),
        ...(meta.profiles || [])
      ]
        .join(" ")
        .toLowerCase();

      if (
        query &&
        !searchable.includes(query)
      ) {
        return false;
      }

      if (
        profile !== "all" &&
        !(meta.profiles || []).includes(profile)
      ) {
        return false;
      }

      return true;

    })
    .sort(
      (a, b) =>
        Number(a.sortOrder || 0) -
        Number(b.sortOrder || 0)
    );
}


/* =========================================================
   RENDER PRODUCT CAROUSEL
========================================================= */

function renderCarousel(cat) {

  if (!carousel) {
    return;
  }

  carousel.innerHTML = "";

  const products =
    getVisibleProducts(cat);

  products.forEach((p) => {

    const card =
      document.createElement("article");

    card.className = "product-card";

    card.innerHTML = `
      <div class="product-image-wrap">
        <img
          src="${p.img}"
          alt="${p.name}"
          loading="lazy"
          decoding="async"
        >
      </div>

      <div class="product-card-content">

        <h3>${p.name}</h3>

        <p class="product-description">
          ${p.desc || ""}
        </p>

        <div class="product-price">
          ₱${Number(
            p.price || PRODUCT_PRICE || 430
          ).toLocaleString()}
        </div>

        <div class="product-actions">

          <button
            type="button"
            class="view-product-btn"
            data-product-id="${p.id}"
          >
            View Details
          </button>

          <button
            type="button"
            class="add-cart-btn"
            data-product-id="${p.id}"
          >
            Add to Cart
          </button>

        </div>

      </div>
    `;

    carousel.appendChild(card);
  });

  updateCarouselArrows();
}


/* =========================================================
   SEARCH
   DEBOUNCED TO REDUCE RE-RENDERING
========================================================= */

if (productSearch) {

  productSearch.addEventListener("input", () => {

    clearTimeout(searchRenderTimer);

    searchRenderTimer = setTimeout(() => {
      renderCarousel(activeCat);
    }, 120);

  });

}


/* =========================================================
   PROFILE FILTER
========================================================= */

if (profileFilter) {

  profileFilter.addEventListener("change", () => {
    renderCarousel(activeCat);
  });

}


/* =========================================================
   PRODUCT CATEGORY BUTTONS
========================================================= */

document.addEventListener("click", (event) => {

  const categoryButton =
    event.target.closest("[data-category]");

  if (!categoryButton) {
    return;
  }

  const category =
    categoryButton.dataset.category;

  if (!category) {
    return;
  }

  activeCat = category;

  document
    .querySelectorAll("[data-category]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === activeCat
      );
    });

  renderCarousel(activeCat);
});


/* =========================================================
   PRODUCT ACTIONS
========================================================= */

document.addEventListener("click", (event) => {

  const addButton =
    event.target.closest(".add-cart-btn");

  if (addButton) {

    const productId =
      addButton.dataset.productId;

    const product =
      catalog.find(productId);

    if (!product) {
      return;
    }

    cart.add(product, 1);

    updateCartUI();

    return;
  }


  const viewButton =
    event.target.closest(".view-product-btn");

  if (viewButton) {

    const productId =
      viewButton.dataset.productId;

    const product =
      catalog.find(productId);

    if (!product) {
      return;
    }

    activeProduct = product;

    openProductModal(product);
  }

});


/* =========================================================
   CART UI
========================================================= */

function updateCartUI() {

  if (cartCount) {
    cartCount.textContent =
      String(cart.count());
  }

  if (typeof renderCart === "function") {
    renderCart();
  }
}


/* =========================================================
   PRODUCT MODAL
========================================================= */

function openProductModal(product) {

  const modal =
    document.querySelector("#productModal");

  if (!modal) {
    return;
  }

  const meta =
    PRODUCT_META[product.id] || {};

  const image =
    modal.querySelector("[data-product-image]");

  const name =
    modal.querySelector("[data-product-name]");

  const description =
    modal.querySelector("[data-product-description]");

  if (image) {
    image.src = product.img;
    image.alt = product.name;
  }

  if (name) {
    name.textContent = product.name;
  }

  if (description) {
    description.textContent =
      product.desc || "";
  }

  const topNotes =
    modal.querySelector("[data-top-notes]");

  const heartNotes =
    modal.querySelector("[data-heart-notes]");

  const baseNotes =
    modal.querySelector("[data-base-notes]");

  if (topNotes) {
    topNotes.textContent =
      (product.topNotes || []).join(", ");
  }

  if (heartNotes) {
    heartNotes.textContent =
      (product.heartNotes || []).join(", ");
  }

  if (baseNotes) {
    baseNotes.textContent =
      (product.baseNotes || []).join(", ");
  }

  modal.classList.add("open");
}


/* =========================================================
   MODAL CLOSE
========================================================= */

document.addEventListener("click", (event) => {

  const closeButton =
    event.target.closest("[data-close-modal]");

  if (closeButton) {

    const modal =
      closeButton.closest(".modal");

    if (modal) {
      modal.classList.remove("open");
    }

    return;
  }

  if (
    event.target.classList.contains("modal")
  ) {
    event.target.classList.remove("open");
  }

});


/* =========================================================
   WISHLIST
========================================================= */

class WishlistManager {

  constructor(storageKey = "auraEssenceWishlist") {

    this.storageKey = storageKey;

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(storageKey) || "[]"
        );

      this.items =
        Array.isArray(saved)
          ? saved
          : [];

    } catch {

      this.items = [];

    }
  }

  save() {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.items)
    );
  }

  has(id) {
    return this.items.includes(id);
  }

  toggle(id) {

    if (this.has(id)) {

      this.items =
        this.items.filter(
          item => item !== id
        );

    } else {

      this.items.push(id);

    }

    this.save();

    return this.has(id);
  }

  all() {
    return this.items;
  }
}

const wishlist =
  new WishlistManager();


function updateWishlistPanel() {

  if (!wishlistCount) {
    return;
  }

  wishlistCount.textContent =
    String(wishlist.all().length);
}


/* =========================================================
   CAROUSEL ARROWS
========================================================= */

function updateCarouselArrows() {

  if (!carousel) {
    return;
  }

  const wrapper =
    carousel.parentElement;

  if (!wrapper) {
    return;
  }

  const left =
    wrapper.querySelector(
      "[data-carousel-prev]"
    );

  const right =
    wrapper.querySelector(
      "[data-carousel-next]"
    );

  const canScroll =
    carousel.scrollWidth >
    carousel.clientWidth + 2;

  if (left) {
    left.disabled =
      !canScroll ||
      carousel.scrollLeft <= 2;
  }

  if (right) {
    right.disabled =
      !canScroll ||
      carousel.scrollLeft +
        carousel.clientWidth >=
        carousel.scrollWidth - 2;
  }
}


document.addEventListener("click", (event) => {

  const previous =
    event.target.closest(
      "[data-carousel-prev]"
    );

  if (previous && carousel) {

    carousel.scrollBy({
      left: -320,
      behavior: "smooth"
    });

    return;
  }

  const next =
    event.target.closest(
      "[data-carousel-next]"
    );

  if (next && carousel) {

    carousel.scrollBy({
      left: 320,
      behavior: "smooth"
    });

  }

});


if (carousel) {

  carousel.addEventListener(
    "scroll",
    updateCarouselArrows,
    { passive: true }
  );

}


/* =========================================================
   INITIAL RENDER
========================================================= */

renderCarousel(activeCat);

renderWishlistPanelIfAvailable();

updateWishlistPanel();

requestAnimationFrame(
  updateCarouselArrows
);


/* =========================================================
   HELPER
========================================================= */

function renderWishlistPanelIfAvailable() {

  if (
    typeof renderWishlist ===
    "function"
  ) {
    renderWishlist();
  }

}


/* =========================================================
   OPTIONAL PRODUCT SYNC
========================================================= */

async function refreshProductsFromServer() {

  try {

    const result =
      await api.get({
        action: "products"
      });

    if (
      !result ||
      !Array.isArray(result.products)
    ) {
      return;
    }

    result.products.forEach(product => {

      if (!product || !product.id) {
        return;
      }

      catalog.upsert(product);

    });

    renderCarousel(activeCat);

    updateCarouselArrows();

  } catch (error) {

    console.warn(
      "Product sync failed:",
      error
    );

  }

}


/* =========================================================
   PAGE VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      requestAnimationFrame(() => {
        updateCarouselArrows();
      });

    }

  }
);


/* =========================================================
   RESIZE
========================================================= */

let resizeTimer;

window.addEventListener(
  "resize",
  () => {

    clearTimeout(resizeTimer);

    resizeTimer =
      setTimeout(() => {
        updateCarouselArrows();
      }, 100);

  },
  { passive: true }
);


/* =========================================================
   START OPTIONAL BACKGROUND SYNC
========================================================= */

setTimeout(() => {

  refreshProductsFromServer();

}, 500);
