import { Product, PRODUCTS, PRODUCT_PRICE, PRODUCT_META } from "./products.js";

// ============================================================
// AURA & ESSENCE FRONTEND
// Optimized for faster search, rendering, API requests,
// caching, and product lookups.
// ============================================================

const reviewStats = {};

// ============================================================
// OOP CORE SERVICES
// ============================================================

class ProductCatalog {
  constructor(products, meta = {}) {
    this.products = [];
    this.byId = new Map();
    this.meta = meta;

    products.forEach(product => {
      this.upsert({
        ...product,
        ...(meta[product.id] || {})
      });
    });
  }

  all() {
    return this.products;
  }

  find(id) {
    return this.byId.get(String(id));
  }

  upsert(data) {
    const id = String(data.id);
    const product = new Product(data);
    const existing = this.byId.get(id);

    if (existing) {
      const index = this.products.indexOf(existing);

      if (index !== -1) {
        this.products[index] = product;
      }
    } else {
      this.products.push(product);
    }

    this.byId.set(id, product);

    return product;
  }

  remove(id) {
    const key = String(id);
    const product = this.byId.get(key);

    if (!product) return;

    this.products = this.products.filter(
      item => item.id !== product.id
    );

    this.byId.delete(key);
  }
}


// ============================================================
// CART MANAGER
// ============================================================

class CartManager {
  constructor(storageKey = "aeCart") {
    this.storageKey = storageKey;

    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      this.items = Array.isArray(saved) ? saved : [];
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

  find(id) {
    return this.items.find(
      item => String(item.id) === String(id)
    );
  }

  clear() {
    this.items = [];
    this.save();
  }

  add(product, qty = 1) {
    if (
      !product ||
      product.active === false ||
      product.stock === 0
    ) {
      return false;
    }

    const existing = this.find(product.id);
    const nextQty = (existing?.qty || 0) + qty;

    if (
      product.stock != null &&
      nextQty > Number(product.stock)
    ) {
      return false;
    }

    if (existing) {
      existing.qty = nextQty;
    } else {
      this.items.push({
        id: product.id,
        qty
      });
    }

    this.save();

    return true;
  }

  change(product, delta) {
    const item = this.find(product?.id);

    if (!item || !product) return;

    item.qty = Math.max(
      0,
      item.qty + delta
    );

    if (product.stock != null) {
      item.qty = Math.min(
        item.qty,
        Number(product.stock)
      );
    }

    if (item.qty === 0) {
      this.remove(product.id);
    }

    this.save();
  }

  remove(id) {
    this.items = this.items.filter(
      item => String(item.id) !== String(id)
    );

    this.save();
  }

  total(catalog) {
    return this.items.reduce((sum, item) => {
      const product = catalog.find(item.id);

      return sum + (
        product
          ? product.priceValue * item.qty
          : 0
      );
    }, 0);
  }
}


// ============================================================
// WISHLIST MANAGER
// ============================================================

class WishlistManager {
  constructor(storageKey = "aeFavorites") {
    this.storageKey = storageKey;

    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) || "[]"
      );

      this.items = Array.isArray(saved) ? saved : [];
    } catch {
      this.items = [];
    }
  }

  has(id) {
    return this.items.includes(id);
  }

  toggle(id) {
    this.items = this.has(id)
      ? this.items.filter(item => item !== id)
      : [...this.items, id];

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.items)
    );

    return this.items;
  }
}


// ============================================================
// API CLIENT
// ============================================================

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl || "").trim();
  }

  buildUrl(params = {}) {
    const url = new URL(this.baseUrl);

    Object.entries(params).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          url.searchParams.set(
            key,
            String(value)
          );
        }
      }
    );

    return url;
  }

  async get(params = {}, options = {}) {
    const {
      retries = 3,
      timeout = 10000,
      cache = "no-store"
    } = options;

    let lastError;

    for (
      let attempt = 0;
      attempt < retries;
      attempt++
    ) {
      const controller =
        new AbortController();

      const timer = setTimeout(
        () => controller.abort(),
        timeout
      );

      try {
        const url = this.buildUrl({
          ...params,
          _ts: Date.now()
        });

        const response = await fetch(url, {
          method: "GET",
          cache,
          redirect: "follow",
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        return await response.json();

      } catch (error) {
        clearTimeout(timer);

        lastError = error;

        if (attempt < retries - 1) {
          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                500 * (attempt + 1)
              )
          );
        }
      }
    }

    throw (
      lastError ||
      new Error("API unavailable")
    );
  }

  async post(params = {}, options = {}) {
    const {
      timeout = 15000
    } = options;

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      timeout
    );

    try {
      const response = await fetch(
        this.baseUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8"
          },

          body:
            new URLSearchParams(
              params
            ).toString(),

          redirect: "follow",

          signal:
            controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      return await response.json();

    } finally {
      clearTimeout(timer);
    }
  }
}


// ============================================================
// PRODUCT CATALOG
// ============================================================

const catalog = new ProductCatalog(
  PRODUCTS,
  PRODUCT_META
);


// ============================================================
// PRECOMPUTED PRODUCT SEARCH INDEX
// ============================================================

const productSearchIndex = new Map();

function buildProductSearchIndex() {
  productSearchIndex.clear();

  catalog.all().forEach(p => {
    const meta =
      PRODUCT_META[p.id] || {};

    const profiles =
      Array.isArray(meta.profiles)
        ? meta.profiles
        : String(
            meta.profiles || ""
          ).split(",");

    productSearchIndex.set(
      String(p.id),
      {
        searchable: [
          p.name,
          p.desc,
          p.descLong,
          ...(p.topNotes || []),
          ...(p.heartNotes || []),
          ...(p.baseNotes || []),
          ...profiles
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),

        profiles: profiles
          .map(
            x =>
              String(x)
                .trim()
                .toLowerCase()
          )
          .filter(Boolean)
      }
    );
  });
}

buildProductSearchIndex();


// ============================================================
// GLOBAL MANAGERS
// ============================================================

const cartManager =
  new CartManager();

const wishlistManager =
  new WishlistManager();

let apiClient;

let favorites =
  wishlistManager.items;

let cart =
  cartManager.items;


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getProductById(id) {
  return catalog.find(id);
}

function getCartTotal() {
  return cartManager.total(
    catalog
  );
}

function saveCart() {
  cartManager.items = cart;
  cartManager.save();
  renderCart();
}

function addToCart(id, qty = 1) {
  const product =
    getProductById(id);

  if (!product) return;

  const existing =
    cartManager.find(id);

  const next =
    (existing?.qty || 0) + qty;

  if (
    product.stock != null &&
    next > Number(product.stock)
  ) {
    alert(
      `Only ${product.stock} bottle(s) of ${product.name} available.`
    );

    return;
  }

  if (
    !cartManager.add(
      product,
      qty
    )
  ) {
    return;
  }

  cart =
    cartManager.items;

  renderCart();
}

function changeCartQty(
  id,
  delta
) {
  const product =
    getProductById(id);

  if (!product) return;

  cartManager.change(
    product,
    delta
  );

  cart =
    cartManager.items;

  renderCart();
}

function removeFromCart(id) {
  cartManager.remove(id);

  cart =
    cartManager.items;

  renderCart();
}


// ============================================================
// CART RENDER
// ============================================================

function renderCart() {
  const wrap =
    document.getElementById(
      "cartItems"
    );

  const count =
    document.getElementById(
      "cartCount"
    );

  const total =
    document.getElementById(
      "cartTotal"
    );

  if (!wrap) return;

  const valid =
    cart.filter(
      x => getProductById(x.id)
    );

  if (
    valid.length !== cart.length
  ) {
    cart = valid;

    localStorage.setItem(
      "aeCart",
      JSON.stringify(cart)
    );
  }

  const totalQty =
    cart.reduce(
      (sum, item) =>
        sum + item.qty,
      0
    );

  if (count) {
    count.textContent =
      `${totalQty} ${
        totalQty === 1
          ? "item"
          : "items"
      }`;
  }

  if (total) {
    total.textContent =
      `₱${getCartTotal().toLocaleString()}`;
  }

  if (!cart.length) {
    wrap.innerHTML =
      '<div class="cart-empty">Your cart is empty. Add one or more fragrances above.</div>';

    return;
  }

  wrap.innerHTML =
    cart
      .map(item => {
        const p =
          getProductById(
            item.id
          );

        return `
          <div class="cart-item">

            <img
              src="${p.img}"
              alt="${p.name}"
              loading="lazy"
              decoding="async"
            >

            <div>
              <div class="cart-item-name">
                ${p.name}
              </div>

              <div class="cart-item-price">
                ₱${Number(
                  p.price ||
                  PRODUCT_PRICE
                ).toLocaleString()} each
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
// CART EVENT DELEGATION
// ============================================================

document
  .getElementById("cartItems")
  ?.addEventListener(
    "click",
    e => {
      const minus =
        e.target.closest(
          "[data-cart-minus]"
        );

      const plus =
        e.target.closest(
          "[data-cart-plus]"
        );

      const remove =
        e.target.closest(
          "[data-cart-remove]"
        );

      if (minus) {
        changeCartQty(
          minus.dataset.cartMinus,
          -1
        );
      }

      if (plus) {
        changeCartQty(
          plus.dataset.cartPlus,
          1
        );
      }

      if (remove) {
        removeFromCart(
          remove.dataset.cartRemove
        );
      }
    }
  );


// ============================================================
// INITIAL DOM REFERENCES
// ============================================================

const carousel =
  document.getElementById(
    "carousel"
  );

const carouselPrev =
  document.getElementById(
    "carouselPrev"
  );

const carouselNext =
  document.getElementById(
    "carouselNext"
  );

const scentSelect =
  document.getElementById(
    "scent"
  );

const tabs =
  document.querySelectorAll(
    ".tab"
  );

let activeCat = "men";

const productSearch =
  document.getElementById(
    "productSearch"
  );

const profileFilter =
  document.getElementById(
    "profileFilter"
  );

const wishlistToggle =
  document.getElementById(
    "wishlistToggle"
  );

const wishlistPanel =
  document.getElementById(
    "wishlistPanel"
  );

const wishlistItems =
  document.getElementById(
    "wishlistItems"
  );

const wishlistEmpty =
  document.getElementById(
    "wishlistEmpty"
  );


// ============================================================
// PRODUCT FILTERING
// ============================================================

function getVisibleProducts(cat) {
  const query =
    (
      productSearch?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const profile =
    String(
      profileFilter?.value ||
      "all"
    )
      .trim()
      .toLowerCase();

  return catalog
    .all()
    .filter(p => {

      const index =
        productSearchIndex.get(
          String(p.id)
        );

      const searchable =
        index?.searchable ||
        "";

      const profiles =
        index?.profiles ||
        [];

      const matchesSearch =
        !query ||
        searchable.includes(
          query
        );

      const matchesProfile =
        profile === "all" ||
        profiles.includes(
          profile
        );

      const matchesCategory =
        cat === "all" ||
        p.cat === cat;

      return (
        matchesSearch &&
        matchesProfile &&
        matchesCategory
      );
    })
    .sort(
      (a, b) =>
        Number(
          a.sortOrder || 999
        ) -
        Number(
          b.sortOrder || 999
        )
    );
}
