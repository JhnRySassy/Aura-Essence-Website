export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl || "").trim();
  }

  assertConfigured() {
    if (
      !this.baseUrl ||
      this.baseUrl.includes(
        "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
      )
    ) {
      throw new Error(
        "Admin API URL is not configured. Open assets/js/admin.js and replace PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE with your Google Apps Script /exec URL."
      );
    }

    if (
      !/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(
        this.baseUrl
      )
    ) {
      throw new Error(
        "Invalid Admin API URL. Use the deployed Google Apps Script Web App URL ending in /exec."
      );
    }
  }

  async parse(response) {
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Admin API HTTP ${response.status}. ${text
          .replace(/\s+/g, " ")
          .slice(0, 200)}`
      );
    }

    try {
      return JSON.parse(text);
    } catch (_) {
      const preview = text.replace(/\s+/g, " ").slice(0, 180);

      throw new Error(
        `Admin API returned non-JSON content. Response: ${preview}`
      );
    }
  }

  async get(params = {}) {
    this.assertConfigured();

    const maxAttempts = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const url = new URL(this.baseUrl);

        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });

        // Prevent Google/browser from reusing an old response.
        url.searchParams.set("_ts", Date.now().toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          redirect: "follow"
        });

        // Google Apps Script ContentService can occasionally return
        // an intermittent 404 during its redirect/content serving.
        // Retry GET requests because these are read-only operations.
        if (response.status === 404) {
          throw new Error(
            "Temporary Google Apps Script 404 while serving the Web App."
          );
        }

        return await this.parse(response);
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          break;
        }

        // Progressive retry delay:
        // 800ms → 1500ms → 2500ms → 4000ms
        const delays = [800, 1500, 2500, 4000];
        await new Promise(resolve =>
          setTimeout(resolve, delays[attempt - 1])
        );
      }
    }

    throw new Error(
      `Admin API temporarily unavailable after ${maxAttempts} attempts. ${lastError?.message || ""}`
    );
  }

  async post(params = {}) {
    this.assertConfigured();

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams(params).toString(),
      redirect: "follow",
      cache: "no-store"
    });

    return this.parse(response);
  }
}
