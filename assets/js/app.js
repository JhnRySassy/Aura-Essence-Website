// ============================================================
// FIND YOUR SCENT QUIZ
// ============================================================

const quizAnswers = {
  profile: [],
  occasion: "",
  strength: "",
};

// ============================================================
// FIND YOUR SCENT PROFILE / CHARACTER LIST
// ============================================================

const SCENT_PROFILES = [
  "Fresh",
  "Spicy",
  "Citrus",
  "Amber",
  "Woody",
  "Aquatic",
  "Sweet",
  "Warm",
  "Vanilla",
  "Chestnut",
  "Marine",
  "Aromatic",
  "Minty",
  "Floral",
  "Rose",
  "Powdery",
  "Coffee",
  "Musky",
  "Fruity",
];

// ============================================================
// NORMALIZE PROFILE
// ============================================================

function normalizeProfile(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

// ============================================================
// CREATE PROFILE OPTIONS DYNAMICALLY
//
// This automatically creates all Find Your Scent
// character/profile buttons.
//
// Existing HTML only needs:
//
// <div class="quiz-options" data-question="profile"></div>
// ============================================================

function renderScentProfileQuizOptions() {
  const profileGroup = document.querySelector(
    '.quiz-options[data-question="profile"]',
  );

  if (!profileGroup) {
    console.warn(
      'Find Your Scent profile group [data-question="profile"] was not found.',
    );

    return;
  }

  profileGroup.innerHTML = SCENT_PROFILES.map((profile) => {
    const value = normalizeProfile(profile);

    return `
      <button
        type="button"
        class="quiz-option"
        data-value="${escapeHTML(value)}"
      >
        ${escapeHTML(profile)}
      </button>
    `;
  }).join("");
}

// ============================================================
// QUIZ OPTION SELECTION
//
// PROFILE / CHARACTER:
// Multiple selection
//
// OCCASION:
// Single selection
//
// STRENGTH:
// Single selection
// ============================================================

function setupQuizOptions() {
  const quizGroups = document.querySelectorAll(".quiz-options");

  quizGroups.forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".quiz-option");

      if (!btn) {
        return;
      }

      const question = group.dataset.question;

      let value = btn.dataset.value || "";

      // ======================================================
      // PROFILE / CHARACTER
      //
      // MULTIPLE SELECTION
      // ======================================================

      if (question === "profile") {
        const profile = normalizeProfile(value);

        if (!profile) {
          return;
        }

        const currentProfiles = Array.isArray(quizAnswers.profile)
          ? quizAnswers.profile
          : [];

        const exists = currentProfiles.includes(profile);

        if (exists) {
          // Remove selected profile
          quizAnswers.profile = currentProfiles.filter(
            (item) => item !== profile,
          );
        } else {
          // Add selected profile
          quizAnswers.profile = [...currentProfiles, profile];
        }

        // Update visual selected state
        group.querySelectorAll(".quiz-option").forEach((option) => {
          const optionValue = normalizeProfile(option.dataset.value);

          option.classList.toggle(
            "active",
            quizAnswers.profile.includes(optionValue),
          );
        });

        return;
      }

      // ======================================================
      // STRENGTH
      //
      // SINGLE SELECTION
      // ======================================================

      if (question === "strength") {
        value = normalizeStrength(value);

        quizAnswers.strength = value;

        group.querySelectorAll(".quiz-option").forEach((option) => {
          option.classList.toggle("active", option === btn);
        });

        return;
      }

      // ======================================================
      // OCCASION
      //
      // SINGLE SELECTION
      // ======================================================

      if (question === "occasion") {
        quizAnswers.occasion = normalizeProfile(value);

        group.querySelectorAll(".quiz-option").forEach((option) => {
          option.classList.toggle("active", option === btn);
        });

        return;
      }

      // ======================================================
      // OTHER QUIZ QUESTIONS
      //
      // Keep original single-select behavior
      // ======================================================

      quizAnswers[question] = value;

      group.querySelectorAll(".quiz-option").forEach((option) => {
        option.classList.toggle("active", option === btn);
      });
    });
  });
}

// ============================================================
// INITIALIZE QUIZ OPTIONS
// ============================================================

renderScentProfileQuizOptions();

setupQuizOptions();

// ============================================================
// FIND MY SCENT
// ============================================================

document.getElementById("findScentBtn")?.addEventListener("click", () => {
  // ==========================================================
  // SELECTED PROFILE / CHARACTER
  // ==========================================================

  const selectedProfiles = Array.isArray(quizAnswers.profile)
    ? quizAnswers.profile
        .map((profile) => normalizeProfile(profile))
        .filter(Boolean)
    : [];

  // ==========================================================
  // SELECTED OCCASION
  // ==========================================================

  const selectedOccasion = normalizeProfile(quizAnswers.occasion);

  // ==========================================================
  // SELECTED STRENGTH
  // ==========================================================

  const selectedStrength = normalizeStrength(quizAnswers.strength);

  // ==========================================================
  // SCORE PRODUCTS
  // ==========================================================

  const scores = catalog
    .all()
    .filter((product) => product.active !== false)
    .map((product) => {
      const meta = PRODUCT_META[product.id] || {};

      let score = 0;

      // ======================================================
      // PRODUCT PROFILES
      // ======================================================

      const productProfiles = Array.isArray(meta.profiles)
        ? meta.profiles
            .map((profile) => normalizeProfile(profile))
            .filter(Boolean)
        : String(meta.profiles || "")
            .split(",")
            .map((profile) => normalizeProfile(profile))
            .filter(Boolean);

      // ======================================================
      // MULTIPLE PROFILE MATCH
      //
      // Every selected profile that matches the perfume
      // adds points.
      //
      // Example:
      //
      // User:
      // Fresh + Citrus + Aquatic
      //
      // Perfume:
      // Fresh + Citrus
      //
      // Score:
      // +4 Fresh
      // +4 Citrus
      // = +8
      // ======================================================

      if (selectedProfiles.length) {
        selectedProfiles.forEach((selectedProfile) => {
          if (productProfiles.includes(selectedProfile)) {
            score += 4;
          }
        });
      }

      // ======================================================
      // OCCASION MATCH
      // ======================================================

      const productOccasions = Array.isArray(meta.occasion)
        ? meta.occasion
            .map((value) => normalizeProfile(value))
            .filter(Boolean)
        : String(meta.occasion || "")
            .split(",")
            .map((value) => normalizeProfile(value))
            .filter(Boolean);

      if (
        selectedOccasion &&
        productOccasions.includes(selectedOccasion)
      ) {
        score += 3;
      }

      // ======================================================
      // STRENGTH MATCH
      // ======================================================

      const productStrength = normalizeStrength(meta.strength);

      if (
        quizAnswers.strength &&
        productStrength === selectedStrength
      ) {
        score += 2;
      }

      // ======================================================
      // RETURN SCORE
      // ======================================================

      return {
        p: product,
        score,
        matchedProfiles: selectedProfiles.filter((profile) =>
          productProfiles.includes(profile),
        ),
      };
    })
    .sort((a, b) => {
      // Highest score first
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // If tied, prefer more matching profiles
      return b.matchedProfiles.length - a.matchedProfiles.length;
    });

  // ==========================================================
  // GET WINNER
  // ==========================================================

  const winner = scores[0]?.p || catalog.all()[0];

  if (!winner) {
    return;
  }

  // ==========================================================
  // DISPLAY RESULT
  // ==========================================================

  document.getElementById("quizResultName").textContent =
    winner.name;

  // Get winner metadata
  const winnerMeta = PRODUCT_META[winner.id] || {};

  const winnerProfiles = Array.isArray(winnerMeta.profiles)
    ? winnerMeta.profiles
    : String(winnerMeta.profiles || "")
        .split(",")
        .map((profile) => profile.trim())
        .filter(Boolean);

  // ==========================================================
  // MATCHED PROFILE DISPLAY
  // ==========================================================

  const matchedProfiles = selectedProfiles.filter((selected) =>
    winnerProfiles.some(
      (profile) =>
        normalizeProfile(profile) === normalizeProfile(selected),
    ),
  );

  let resultText = winner.desc || "";

  if (matchedProfiles.length) {
    resultText +=
      " Your selected scent character" +
      (matchedProfiles.length > 1 ? "s are: " : " is: ") +
      matchedProfiles
        .map(
          (profile) =>
            profile.charAt(0).toUpperCase() + profile.slice(1),
        )
        .join(", ") +
      ".";
  }

  if (winner.occasion) {
    resultText +=
      " Best suited for: " +
      winner.occasion +
      ".";
  }

  document.getElementById("quizResultText").textContent =
    resultText;

  // ==========================================================
  // SHOW RESULT
  // ==========================================================

  document.getElementById("quizResult").classList.add("show");

  // ==========================================================
  // SET ORDER BUTTON
  // ==========================================================

  document.getElementById("quizOrderBtn").dataset.id =
    winner.id;
});

// ============================================================
// QUIZ ORDER BUTTON
// ============================================================

document.getElementById("quizOrderBtn")?.addEventListener(
  "click",
  (e) => {
    const productId = e.currentTarget.dataset.id;

    if (!productId) {
      return;
    }

    scentSelect.value = productId;

    syncQuantity();

    document.getElementById("order")?.scrollIntoView({
      behavior: "smooth",
    });
  },
);
