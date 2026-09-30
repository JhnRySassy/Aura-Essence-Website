import { ApiClient } from "./admin-api.js";
import { PRODUCTS } from "./products.js";

class AdminSession {
  constructor() {
    this.data =
      JSON.parse(sessionStorage.getItem("aeAdminSession") || "null") || {};
  }

  save(identifier, password, key) {
    this.data = {
      identifier,
      password,
      key
    };

    sessionStorage.setItem(
      "aeAdminSession",
      JSON.stringify(this.data)
    );
  }

  clear() {
    this.data = {};
    sessionStorage.removeItem("aeAdminSession");
  }

  get() {
    return this.data;
  }

  valid() {
    return !!(
      this.data.identifier &&
      this.data.password &&
      this.data.key
    );
  }
}


class AdminApp {

  constructor() {

    /*
     * IMPORTANT:
     * Replace this with your actual Google Apps Script
     * Web App URL ending in /exec
     */
    this.api = new ApiClient(
      "https://script.google.com/macros/s/AKfycby2010iiEHQGK7oIaM96MSTMiVt_a-5Dy8qWdnofO1vUtZInhunaR8UxC61r_KIex7g1w/exec"
    );

    this.session = new AdminSession();

    this.products = [];
    this.orders = [];
    this.promotions = [];
    this.settings = {};

    this.views = [
      "dashboard",
      "orders",
      "products",
      "promotions",
      "homepage",
      "audit"
    ];

    this.bind();
  }


  auth() {
    return this.session.get();
  }


  setStatus(message, error = false) {

    const el = document.getElementById("globalStatus");

    if (!el) return;

    el.textContent = message;

    el.className =
      "status " +
      (error ? "error" : "ok");
  }


  loginStatus(message, error = false) {

    const el = document.getElementById("loginStatus");

    if (!el) return;

    el.textContent = message;

    el.className =
      "status " +
      (error ? "error" : "");
  }


  async request(method, params) {

    const response =
      method === "GET"
        ? await this.api.get(params)
        : await this.api.post(params);

    if (!response.success) {
      throw new Error(
        response.message || "Request failed."
      );
    }

    return response;
  }


  bind() {

    document
      .getElementById("credentialsForm")
      .addEventListener(
        "submit",
        e => this.credentials(e)
      );


    document
      .getElementById("keyForm")
      .addEventListener(
        "submit",
        e => this.verifyKey(e)
      );


    document
      .getElementById("backLogin")
      .onclick = () => {

        document
          .getElementById("keyForm")
          .classList
          .add("hidden");

        document
          .getElementById("credentialsForm")
          .classList
          .remove("hidden");
      };


    document
      .getElementById("logoutBtn")
      .onclick = () => {

        this.session.clear();

        location.reload();
      };


    document
      .querySelectorAll(".nav-item")
      .forEach(button => {

        button.onclick = () =>
          this.showView(
            button.dataset.view
          );
      });


    document
      .getElementById("refreshOrders")
      .onclick = () =>
        this.loadOrders();


    document
      .getElementById("exportOrders")
      .onclick = () =>
        this.exportOrders();


    document
      .getElementById("orderSearch")
      .oninput = () =>
        this.renderOrders();


    document
      .getElementById("refreshProducts")
      .onclick = () =>
        this.loadProducts();


    document
      .getElementById("newProduct")
      .onclick = () =>
        this.editProduct(null);


    document
      .getElementById("productSearch")
      .oninput = () =>
        this.renderProducts();


    document
      .getElementById("closeEditor")
      .onclick = () =>
        document
          .getElementById("productEditor")
          .classList
          .add("hidden");


    document
      .getElementById("productForm")
      .onsubmit = e =>
        this.saveProduct(e);


    document
      .getElementById("deleteProduct")
      .onclick = () =>
        this.deleteProduct();


    document
      .getElementById("newPromo")
      .onclick = () =>
        this.editPromotion(null);


    document
      .getElementById("closePromo")
      .onclick = () =>
        document
          .getElementById("promoEditor")
          .classList
          .add("hidden");


    document
      .getElementById("promoForm")
      .onsubmit = e =>
        this.savePromotion(e);


    document
      .getElementById("settingsForm")
      .onsubmit = e =>
        this.saveSettings(e);


    document
      .getElementById("refreshAudit")
      .onclick = () =>
        this.loadAudit();


    if (this.session.valid()) {
      this.openApp();
    }
  }


  async credentials(e) {

    e.preventDefault();

    const identifier =
      document
        .getElementById("loginIdentifier")
        .value
        .trim();

    const password =
      document
        .getElementById("loginPassword")
        .value;


    if (!identifier || !password) {
      return;
    }


    this.loginStatus(
      "Checking credentials…"
    );


    try {

      const response =
        await this.api.post({
          action: "adminLogin",
          identifier,
          password
        });


      if (!response.success) {
        throw new Error(
          response.message
        );
      }


      this.pending = {
        identifier,
        password
      };


      document
        .getElementById("credentialsForm")
        .classList
        .add("hidden");


      document
        .getElementById("keyForm")
        .classList
        .remove("hidden");


      this.loginStatus(
        "Credentials accepted. Enter your admin key."
      );


    } catch (error) {

      this.loginStatus(
        error.message,
        true
      );
    }
  }


  async verifyKey(e) {

    e.preventDefault();


    const key =
      document
        .getElementById("loginKey")
        .value
        .trim();


    if (!key) {
      this.loginStatus(
        "Please enter your admin key.",
        true
      );

      return;
    }


    try {

      const response =
        await this.api.post({
          action: "adminVerifyKey",

          identifier:
            this.pending.identifier,

          password:
            this.pending.password,

          /*
           * IMPORTANT:
           * Backend expects adminKey.
           */
          adminKey: key
        });


      if (!response.success) {

        throw new Error(
          response.message
        );
      }


      this.session.save(
        this.pending.identifier,
        this.pending.password,
        key
      );


      this.openApp();


    } catch (error) {

      this.loginStatus(
        error.message,
        true
      );
    }
  }


  cacheRead(key) {
    try { return JSON.parse(sessionStorage.getItem(this.cachePrefix + key) || "null"); }
    catch (_) { return null; }
  }

  cacheWrite(key, value) {
    try { sessionStorage.setItem(this.cachePrefix + key, JSON.stringify(value)); }
    catch (_) {}
  }

  startRealtime() {
    if (this.polling) return;
    this.polling = true;
    const poll = () => {
      if (!this.polling || document.hidden || !this.session.valid()) return;
      this.loadOrders(true).catch(() => {});
      this.loadDashboard(true).catch(() => {});
    };
    this.pollers.orders = setInterval(() => {
      if (!document.hidden) this.loadOrders(true).catch(() => {});
    }, 15000);
    this.pollers.dashboard = setInterval(() => {
      if (!document.hidden) this.loadDashboard(true).catch(() => {});
    }, 30000);
    document.addEventListener("visibilitychange", this._visibilityHandler = () => {
      if (!document.hidden && this.session.valid()) poll();
    });
  }

  stopRealtime() {
    this.polling = false;
    if (this.pollers.orders) clearInterval(this.pollers.orders);
    if (this.pollers.dashboard) clearInterval(this.pollers.dashboard);
    this.pollers.orders = this.pollers.dashboard = null;
    if (this._visibilityHandler) document.removeEventListener("visibilitychange", this._visibilityHandler);
  }

  hydrateCachedAdmin() {
    const dashboard=this.cacheRead("dashboard");
    if (dashboard) this.renderDashboard(dashboard);
    const products=this.cacheRead("products");
    if (Array.isArray(products)) { this.products=products; this.renderProducts(); }
    const promotions=this.cacheRead("promotions");
    if (Array.isArray(promotions)) { this.promotions=promotions; this.renderPromotions(); }
    const settings=this.cacheRead("settings");
    if (settings) { this.settings=settings; this.applySettingsToForm(); }
  }

  applySettingsToForm() {
    const lowStock=document.getElementById("setLowStock"); if(lowStock) lowStock.value=this.settings.lowStockThreshold||5;
    const best=document.getElementById("setBest"); if(best) best.checked=this.settings.showBestSellers!=="false";
    const featured=document.getElementById("setFeatured"); if(featured) featured.checked=this.settings.showFeatured!=="false";
    const newArrivals=document.getElementById("setNew"); if(newArrivals) newArrivals.checked=this.settings.showNewArrivals!=="false";
  }

  async openApp() {

    document
      .getElementById("loginView")
      .classList
      .add("hidden");


    document
      .getElementById("appView")
      .classList
      .remove("hidden");


    try {
      // Cached non-sensitive data paints immediately while fresh data loads.
      this.hydrateCachedAdmin();
      await Promise.all([
        this.loadDashboard(),
        this.loadProducts(),
        this.loadOrders(),
        this.loadPromotions(),
        this.loadSettings()
      ]);
      this.setStatus("Admin connected");
      this.startRealtime();
    } catch (error) {
      this.setStatus(error.message, true);
      this.startRealtime();
    }
  }


  /*
   * IMPORTANT FIX
   *
   * Apps Script expects:
   *
   * identifier
   * password
   * adminKey
   *
   * We also send "key" for compatibility
   * with older code.
   */

  params(extra = {}) {

    const auth =
      this.auth();


    return {

      identifier:
        auth.identifier,

      password:
        auth.password,

      adminKey:
        auth.key,

      key:
        auth.key,

      ...extra
    };
  }


  showView(view) {

    this.views.forEach(
      currentView => {

        const element =
          document.getElementById(
            currentView + "View"
          );

        if (element) {

          element.classList.toggle(
            "hidden",
            currentView !== view
          );
        }
      }
    );


    document
      .querySelectorAll(".nav-item")
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.view === view
        );
      });


    const title =
      document.getElementById(
        "viewTitle"
      );

    if (title) {

      title.textContent =
        view.charAt(0).toUpperCase() +
        view.slice(1);
    }


    if (view === "audit") {

      this.loadAudit();
    }
  }


  async loadDashboard(silent = false) {

    const response =
      await this.request(
        "GET",
        this.params({
          action: "adminDashboard"
        })
      );


    this.cacheWrite("dashboard", response);
    this.renderDashboard(response);
  }


  renderDashboard(response) {

    const stats =
      response.stats || {};


    const cards =
      document.getElementById(
        "statsCards"
      );


    if (cards) {

      cards.innerHTML = [

        [
          "Orders",
          stats.orders || 0
        ],

        [
          "Revenue",
          "₱" +
          Number(
            stats.revenue || 0
          ).toLocaleString()
        ],

        [
          "Completed",
          stats.completed || 0
        ],

        [
          "Pending",
          stats.pending || 0
        ],

        [
          "Customers",
          stats.customers || 0
        ]

      ]
        .map(
          item =>
            `
            <div class="stat">
              <small>${item[0]}</small>
              <strong>${item[1]}</strong>
            </div>
            `
        )
        .join("");
    }


    const topProducts =
      document.getElementById(
        "topProducts"
      );


    if (topProducts) {

      topProducts.innerHTML =

        '<div class="mini-list">' +

        (response.topProducts || [])
          .map(
            (product, index) =>
              `
              <div class="mini">
                <span>
                  ${index + 1}.
                  ${product.name}
                </span>

                <b>
                  ${product.units}
                </b>
              </div>
              `
          )
          .join("") +

        "</div>";
    }


    const lowStockLabel =
      document.getElementById(
        "lowStockLabel"
      );


    if (lowStockLabel) {

      lowStockLabel.textContent =
        "Threshold " +
        (
          Number(
            response.settings?.lowStockThreshold
          ) || 5
        );
    }


    const lowStock =
      document.getElementById(
        "lowStock"
      );


    if (lowStock) {

      lowStock.innerHTML =

        response.lowStock?.length

          ?

          response.lowStock
            .map(
              product =>
                `
                <div class="mini">
                  <span>
                    ${product.name}
                  </span>

                  <b>
                    ${product.stock} left
                  </b>
                </div>
                `
            )
            .join("")

          :

          `
          <p class="muted">
            No low-stock products.
          </p>
          `;
    }
  }


  async loadOrders(silent = false) {

    const response =
      await this.request(
        "GET",
        this.params({
          action: "adminOrders"
        })
      );


    this.orders =
      response.orders || [];


    this.renderOrders();
  }


  renderOrders() {

    const search =
      document
        .getElementById("orderSearch")
        .value
        .toLowerCase();


    const rows =
      this.orders.filter(
        order =>

          [
            order.orderId,
            order.fullname,
            order.contact,
            order.scent
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
      );


    document.getElementById(
      "ordersRows"
    ).innerHTML =

      rows
        .map(
          order =>
            `
            <tr>

              <td>
                <b>
                  ${order.orderId}
                </b>

                <small>
                  ${order.payment || ""}
                </small>
              </td>

              <td>
                ${order.fullname}

                <small>
                  ${order.contact}
                </small>
              </td>

              <td>
                ${
                  (order.items || [])
                    .map(
                      item =>
                        `${item.name} × ${item.qty}`
                    )
                    .join("<br>") ||
                  order.scent ||
                  ""
                }
              </td>

              <td>
                ₱${Number(
                  order.total || 0
                ).toLocaleString()}
              </td>

              <td>

                <select
                  data-status="${order.orderId}"
                >

                  ${
                    [
                      "New",
                      "Confirmed",
                      "Preparing",
                      "Out for Delivery",
                      "Completed",
                      "Cancelled"
                    ]
                      .map(
                        status =>
                          `
                          <option
                            ${
                              status === order.status
                                ? "selected"
                                : ""
                            }
                          >
                            ${status}
                          </option>
                          `
                      )
                      .join("")
                  }

                </select>

              </td>

              <td>
                ${
                  order.timestamp
                    ? new Date(
                        order.timestamp
                      ).toLocaleString()
                    : ""
                }
              </td>

            </tr>
            `
        )
        .join("");


    document
      .querySelectorAll(
        "[data-status]"
      )
      .forEach(
        element => {

          element.onchange = () =>

            this.updateOrder(
              element.dataset.status,
              element.value
            );
        }
      );
  }


  async updateOrder(
    orderId,
    status
  ) {

    try {

      await this.request(
        "POST",
        this.params({
          action:
            "adminUpdateOrderStatus",

          orderId,

          status
        })
      );


      this.setStatus(
        "Order updated"
      );


      await this.loadDashboard();


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  exportOrders() {

    const headers = [
      "Order ID",
      "Customer",
      "Contact",
      "Items",
      "Total",
      "Status",
      "Date"
    ];


    const lines = [

      headers,

      ...this.orders.map(
        order => [

          order.orderId,

          order.fullname,

          order.contact,

          (order.items || [])
            .map(
              item =>
                `${item.name} x ${item.qty}`
            )
            .join(" | "),

          order.total,

          order.status,

          order.timestamp
        ]
      )

    ]

      .map(
        row =>
          row
            .map(
              value =>
                '"' +
                String(
                  value ?? ""
                ).replace(
                  /"/g,
                  '""'
                ) +
                '"'
            )
            .join(",")
      )

      .join("\n");


    const url =
      URL.createObjectURL(
        new Blob(
          [lines],
          {
            type:
              "text/csv"
          }
        )
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      "aura-essence-orders.csv";

    link.click();


    URL.revokeObjectURL(
      url
    );
  }


  async loadProducts() {

    const response =
      await this.request(
        "GET",
        this.params({
          action: "adminProducts"
        })
      );


    this.products =
      response.products || [];
    this.cacheWrite("products", this.products);


    /*
     * If Products sheet is empty,
     * automatically seed existing
     * products from products.js.
     */

    if (
      !this.products.length &&
      PRODUCTS.length
    ) {

      await this.syncCatalog();

      return;
    }


    this.renderProducts();
  }


  async syncCatalog() {

    const products =
      PRODUCTS.map(
        product => ({

          id:
            product.id,

          name:
            product.name,

          cat:
            product.cat,

          desc:
            product.desc,

          img:
            product.img || "",

          price:
            product.price || 430,

          stock:
            product.stock == null
              ? 10
              : product.stock,

          badges:
            product.badges || [],

          active:
            product.active !== false,

          profiles:
            product.profiles || [],

          longevity:
            product.longevity,

          projection:
            product.projection,

          strength:
            product.strength,

          time:
            product.time || [],

          occasion:
            product.occasion,

          descLong:
            product.descLong,

          topNotes:
            product.topNotes || [],

          heartNotes:
            product.heartNotes || [],

          baseNotes:
            product.baseNotes || [],

          application:
            product.application,

          sortOrder:
            product.sortOrder || 0
        })
      );


    await this.request(
      "POST",
      this.params({

        action:
          "adminSeedProducts",

        products:
          JSON.stringify(products)
      })
    );


    const response =
      await this.request(
        "GET",
        this.params({
          action: "adminProducts"
        })
      );


    this.products =
      response.products || [];


    this.renderProducts();


    this.setStatus(
      "Product catalog synced"
    );
  }


  renderProducts() {

    const search =
      document
        .getElementById(
          "productSearch"
        )
        .value
        .toLowerCase();


    const products =
      this.products

        .filter(
          product =>
            (
              product.name +
              " " +
              product.id
            )
              .toLowerCase()
              .includes(search)
        )

        .sort(
          (a, b) =>
            (a.sortOrder || 0) -
            (b.sortOrder || 0)
        );


    document.getElementById(
      "productsRows"
    ).innerHTML =

      products
        .map(
          product =>
            `
            <tr>

              <td>
                <b>
                  ${product.name}
                </b>

                <small>
                  ${product.id}
                </small>
              </td>

              <td>
                ₱${Number(
                  product.price || 0
                ).toLocaleString()}
              </td>

              <td>
                ${
                  product.stock == null
                    ? "—"
                    : product.stock
                }
              </td>

              <td>
                ${
                  (product.badges || [])
                    .map(
                      badge =>
                        `
                        <span class="badge">
                          ${badge}
                        </span>
                        `
                    )
                    .join("") ||
                  "—"
                }
              </td>

              <td>
                ${
                  product.active !== false
                    ? "Yes"
                    : "No"
                }
              </td>

              <td>
                ${
                  product.sortOrder || 0
                }
              </td>

              <td class="row-actions">

                <button
                  class="btn"
                  data-edit="${product.id}"
                >
                  Edit
                </button>

                <button
                  class="btn danger"
                  data-delete="${product.id}"
                >
                  Delete
                </button>

              </td>

            </tr>
            `
        )
        .join("");


    document
      .querySelectorAll(
        "[data-edit]"
      )
      .forEach(
        button => {

          button.onclick = () => {

            this.editProduct(
              this.products.find(
                product =>
                  product.id ===
                  button.dataset.edit
              )
            );
          };
        }
      );


    document
      .querySelectorAll(
        "[data-delete]"
      )
      .forEach(
        button => {

          button.onclick = () =>

            this.deleteProduct(
              button.dataset.delete
            );
        }
      );
  }


  editProduct(product) {

    document
      .getElementById(
        "productEditor"
      )
      .classList
      .remove("hidden");


    document.getElementById(
      "editorTitle"
    ).textContent =
      product
        ? "Edit Product"
        : "Add Product";


    const set =
      (id, value) => {

        const element =
          document.getElementById(id);

        if (element) {

          element.value =
            value ?? "";
        }
      };


    set(
      "pOriginalId",
      product?.id || ""
    );

    set(
      "pId",
      product?.id || ""
    );

    set(
      "pName",
      product?.name || ""
    );

    set(
      "pCat",
      product?.cat || "men"
    );

    set(
      "pPrice",
      product?.price || 430
    );

    set(
      "pStock",
      product?.stock ?? 10
    );

    set(
      "pSort",
      product?.sortOrder || 0
    );

    set(
      "pImg",
      product?.img || ""
    );

    set(
      "pDesc",
      product?.desc || ""
    );

    set(
      "pDescLong",
      product?.descLong || ""
    );

    set(
      "pTop",
      (product?.topNotes || [])
        .join(", ")
    );

    set(
      "pHeart",
      (product?.heartNotes || [])
        .join(", ")
    );

    set(
      "pBase",
      (product?.baseNotes || [])
        .join(", ")
    );

    set(
      "pApplication",
      product?.application || ""
    );

    set(
      "pProfiles",
      (product?.profiles || [])
        .join(", ")
    );

    set(
      "pLongevity",
      product?.longevity || 7
    );

    set(
      "pProjection",
      product?.projection || 7
    );

    const normalizedStrength = {
      light: "subtle",
      subtle: "subtle",
      moderate: "moderate",
      strong: "bold",
      bold: "bold"
    }[String(product?.strength || "moderate").toLowerCase()] || "moderate";

    set(
      "pStrength",
      normalizedStrength
    );

    set(
      "pTime",
      (product?.time || [])
        .join(", ")
    );

    set(
      "pOccasion",
      product?.occasion || ""
    );


    const active =
      document.getElementById(
        "pActive"
      );


    if (active) {

      active.checked =
        product?.active !== false;
    }


    document
      .querySelectorAll(
        ".badge"
      )
      .forEach(
        badge => {

          badge.checked =
            (
              product?.badges || []
            ).includes(
              badge.value
            );
        }
      );
  }


  async saveProduct(e) {

    e.preventDefault();


    const value =
      id => {

        const element =
          document.getElementById(
            id
          );

        return element
          ? element.value.trim()
          : "";
      };


    const payload =
      this.params({

        action:
          "adminSaveProduct",

        id:
          value("pId"),

        name:
          value("pName"),

        cat:
          value("pCat"),

        price:
          value("pPrice"),

        stock:
          value("pStock"),

        sortOrder:
          value("pSort"),

        img:
          value("pImg"),

        desc:
          value("pDesc"),

        descLong:
          value("pDescLong"),

        topNotes:
          value("pTop"),

        heartNotes:
          value("pHeart"),

        baseNotes:
          value("pBase"),

        application:
          value("pApplication"),

        profiles:
          value("pProfiles"),

        longevity:
          value("pLongevity"),

        projection:
          value("pProjection"),

        strength:
          value("pStrength"),

        time:
          value("pTime"),

        occasion:
          value("pOccasion"),

        active:
          document.getElementById(
            "pActive"
          )?.checked || false,

        badges:
          [
            ...document.querySelectorAll(
              ".badge:checked"
            )
          ]
            .map(
              element =>
                element.value
            )
            .join(",")
      });


    try {

      await this.request(
        "POST",
        payload
      );


      this.setStatus(
        "Product saved"
      );


      document
        .getElementById(
          "productEditor"
        )
        .classList
        .add("hidden");


      await this.loadProducts();

      await this.loadDashboard();


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  async deleteProduct(
    id =
      document.getElementById(
        "pOriginalId"
      )?.value
  ) {

    if (!id) return;


    if (
      !confirm(
        "Delete this product?"
      )
    ) {
      return;
    }


    try {

      await this.request(
        "POST",
        this.params({

          action:
            "adminDeleteProduct",

          id
        })
      );


      this.setStatus(
        "Product deleted"
      );


      document
        .getElementById(
          "productEditor"
        )
        .classList
        .add("hidden");


      await this.loadProducts();

      await this.loadDashboard();


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  async loadPromotions() {

    const response =
      await this.request(
        "GET",
        this.params({
          action:
            "adminPromotions"
        })
      );


    this.promotions =
      response.promotions || [];
    this.cacheWrite("promotions", this.promotions);


    this.renderPromotions();
  }


  renderPromotions() {

    const container =
      document.getElementById(
        "promosList"
      );


    if (!container) return;


    container.innerHTML =

      this.promotions
        .map(
          promotion =>
            `
            <div class="list-row">

              <div>

                <b>
                  ${promotion.name}
                </b>

                <small>
                  ${promotion.type}
                  • min ${promotion.minQty}
                  • ${
                    promotion.type ===
                    "fixed_total"

                      ? "₱" +
                        promotion.fixedTotal

                      : promotion.percentOff +
                        "% off"
                  }
                </small>

              </div>

              <div class="row-actions">

                <span class="badge">
                  ${
                    promotion.active
                      ? "ACTIVE"
                      : "OFF"
                  }
                </span>

                <button
                  class="btn"
                  data-pedit="${promotion.id}"
                >
                  Edit
                </button>

                <button
                  class="btn danger"
                  data-pdel="${promotion.id}"
                >
                  Delete
                </button>

              </div>

            </div>
            `
        )
        .join("");


    document
      .querySelectorAll(
        "[data-pedit]"
      )
      .forEach(
        button => {

          button.onclick = () =>

            this.editPromotion(
              this.promotions.find(
                promotion =>
                  promotion.id ===
                  button.dataset.pedit
              )
            );
        }
      );


    document
      .querySelectorAll(
        "[data-pdel]"
      )
      .forEach(
        button => {

          button.onclick = () =>

            this.deletePromotion(
              button.dataset.pdel
            );
        }
      );
  }


  editPromotion(
    promotion
  ) {

    document
      .getElementById(
        "promoEditor"
      )
      .classList
      .remove("hidden");


    const set =
      (id, value) => {

        const element =
          document.getElementById(
            id
          );

        if (element) {

          element.value =
            value ?? "";
        }
      };


    set(
      "promoId",
      promotion?.id || ""
    );

    set(
      "promoName",
      promotion?.name || ""
    );

    set(
      "promoType",
      promotion?.type ||
        "fixed_total"
    );

    set(
      "promoQty",
      promotion?.minQty || 2
    );

    set(
      "promoFixed",
      promotion?.fixedTotal || 840
    );

    set(
      "promoPercent",
      promotion?.percentOff || 0
    );


    const active =
      document.getElementById(
        "promoActive"
      );


    if (active) {

      active.checked =
        promotion?.active !== false;
    }
  }


  async savePromotion(e) {

    e.preventDefault();


    const value =
      id => {

        const element =
          document.getElementById(
            id
          );

        return element
          ? element.value.trim()
          : "";
      };


    try {

      await this.request(
        "POST",
        this.params({

          action:
            "adminSavePromotion",

          id:
            value("promoId"),

          name:
            value("promoName"),

          type:
            value("promoType"),

          minQty:
            value("promoQty"),

          fixedTotal:
            value("promoFixed"),

          percentOff:
            value("promoPercent"),

          active:
            document.getElementById(
              "promoActive"
            )?.checked || false
        })
      );


      document
        .getElementById(
          "promoEditor"
        )
        .classList
        .add("hidden");


      await this.loadPromotions();


      this.setStatus(
        "Promotion saved"
      );


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  async deletePromotion(id) {

    if (
      !confirm(
        "Delete this promotion?"
      )
    ) {
      return;
    }


    try {

      await this.request(
        "POST",
        this.params({

          action:
            "adminDeletePromotion",

          id
        })
      );


      await this.loadPromotions();


      this.setStatus(
        "Promotion deleted"
      );


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  async loadSettings() {

    const response =
      await this.request(
        "GET",
        this.params({
          action:
            "adminSettings"
        })
      );


    this.settings =
      response.settings || {};
    this.cacheWrite("settings", this.settings);


    const lowStock =
      document.getElementById(
        "setLowStock"
      );


    if (lowStock) {

      lowStock.value =
        this.settings
          .lowStockThreshold || 5;
    }


    const best =
      document.getElementById(
        "setBest"
      );


    if (best) {

      best.checked =
        this.settings
          .showBestSellers !==
        "false";
    }


    const featured =
      document.getElementById(
        "setFeatured"
      );


    if (featured) {

      featured.checked =
        this.settings
          .showFeatured !==
        "false";
    }


    const newArrivals =
      document.getElementById(
        "setNew"
      );


    if (newArrivals) {

      newArrivals.checked =
        this.settings
          .showNewArrivals !==
        "false";
    }


    const signature =
      document.getElementById(
        "setSignature"
      );


    if (signature) {

      signature.checked =
        this.settings
          .showSignature !==
        "false";
    }
  }


  async saveSettings(e) {

    e.preventDefault();


    const settings = {

      lowStockThreshold:
        document.getElementById(
          "setLowStock"
        )?.value || 5,

      showBestSellers:
        document.getElementById(
          "setBest"
        )?.checked || false,

      showFeatured:
        document.getElementById(
          "setFeatured"
        )?.checked || false,

      showNewArrivals:
        document.getElementById(
          "setNew"
        )?.checked || false,

      showSignature:
        document.getElementById(
          "setSignature"
        )?.checked || false
    };


    try {

      await this.request(
        "POST",
        this.params({

          action:
            "adminSaveSettings",

          settings:
            JSON.stringify(
              settings
            )
        })
      );


      this.setStatus(
        "Settings saved"
      );


      await this.loadDashboard();


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }


  async loadAudit() {

    try {

      const response =
        await this.request(
          "GET",
          this.params({
            action:
              "adminAudit"
          })
        );


      const table =
        document.getElementById(
          "auditRows"
        );


      if (!table) return;


      table.innerHTML =

        (response.logs || [])
          .map(
            log =>
              `
              <tr>

                <td>
                  ${
                    log.timestamp
                      ? new Date(
                          log.timestamp
                        ).toLocaleString()
                      : ""
                  }
                </td>

                <td>
                  ${log.actor || ""}
                </td>

                <td>
                  ${log.action || ""}
                </td>

              </tr>
              `
          )
          .join("");


    } catch (error) {

      this.setStatus(
        error.message,
        true
      );
    }
  }
}


new AdminApp();
