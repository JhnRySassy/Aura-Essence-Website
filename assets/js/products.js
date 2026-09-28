const PRODUCTS = [
  {
    id: "sauvage",
    name: "Sauvage",
    cat: "men",
    desc: "Fresh, woody-ambery — a bold everyday classic.",
    img: "PASTE_YOUR_SAUVAGE_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Daily • Office • Commute • Night Out"
  },

  {
    id: "invictus",
    name: "Invictus",
    cat: "men",
    desc: "Fresh, sweet, aquatic — energetic and confident.",
    img: "PASTE_YOUR_INVICTUS_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Casual • Gym • Outdoor • Night Out"
  },

  {
    id: "strongerwithyou",
    name: "Stronger With You",
    cat: "men",
    desc: "Sweet, warm, amber — rich and comforting.",
    img: "PASTE_YOUR_STRONGER_WITH_YOU_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Date Night • Night Out • Dinner • Special Occasion"
  },

  {
    id: "aquadigio",
    name: "Aqua Di Gio",
    cat: "men",
    desc: "Fresh, aquatic, woody — clean and effortless.",
    img: "PASTE_YOUR_AQUA_DI_GIO_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Daily • Office • Commute • Beach • Outdoor"
  },

  {
    id: "eros",
    name: "Eros",
    cat: "men",
    desc: "Fresh, sweet, woody — bold and energetic.",
    img: "PASTE_YOUR_EROS_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Night Out • Party • Date Night • Special Occasion"
  },

  {
    id: "missdior",
    name: "Miss Dior",
    cat: "women",
    desc: "Floral, sweet, elegant — feminine and romantic.",
    img: "PASTE_YOUR_MISS_DIOR_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Date • Brunch • Office • Wedding • Special Occasion"
  },

  {
    id: "blackop",
    name: "YSL Black Opium",
    cat: "women",
    desc: "Sweet, warm, floral — sensual and intense.",
    img: "PASTE_YOUR_BLACK_OPIUM_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Date Night • Night Out • Party • Dinner"
  },

  {
    id: "valaya",
    name: "Valaya",
    cat: "women",
    desc: "Fresh, floral, clean — soft and sophisticated.",
    img: "PASTE_YOUR_VALAYA_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Office • Brunch • Wedding • Date • Special Occasion"
  },

  {
    id: "paradoxe",
    name: "Prada Paradoxe",
    cat: "women",
    desc: "Floral, warm, elegant — modern and feminine.",
    img: "PASTE_YOUR_PARADOXE_IMAGE_DATA_HERE",
    descLong: "...",
    topNotes: [],
    heartNotes: [],
    baseNotes: [],
    application: "...",
    occasion: "Daily • Office • Date • Brunch • Night Out"
  },

  {
    id: "eclat",
    name: "Eclat",
    cat: "women",
    desc: "Fresh, floral, airy — soft and luminous.",
    img: "PASTE_YOUR_ECLAT_IMAGE_DATA_HERE",
    descLong:
      "Eclat d'Arpege is a light, airy floral fragrance with a fresh green opening and a delicate fruity-floral heart. Its character is soft, clean, and luminous, making it easy to wear when you want something understated rather than heavy. The musky woody base keeps the scent smooth and close to the skin as it dries down.",
    topNotes: ["Green Lilac", "Lemon Leaves"],
    heartNotes: [
      "Peach Blossom",
      "Wisteria",
      "Green Tea",
      "Peony"
    ],
    baseNotes: ["White Cedar", "Amber", "Musk"],
    application:
      "For a subtle everyday effect, use 2 sprays on the neck and one behind each ear. For a fresh all-over impression, spray lightly on clothing from a distance. Reapply lightly during the day instead of applying many sprays at once.",
    occasion: "Daily • Office • School • Casual Daytime"
  }
];

const PRODUCT_META = {
  sauvage: {
    profiles: ["fresh", "woody"],
    occasion: ["day", "office", "night"],
    strength: "bold",
    longevity: 8,
    projection: 8,
    time: ["day", "night"],
    badges: ["FEATURED"]
  },

  invictus: {
    profiles: ["fresh", "sweet"],
    occasion: ["day", "outdoor"],
    strength: "moderate",
    longevity: 7,
    projection: 7,
    time: ["day"],
    badges: []
  },

  strongerwithyou: {
    profiles: ["sweet", "warm"],
    occasion: ["night"],
    strength: "bold",
    longevity: 9,
    projection: 8,
    time: ["night"],
    badges: ["FEATURED"]
  },

  aquadigio: {
    profiles: ["fresh", "woody"],
    occasion: ["day", "office", "outdoor"],
    strength: "moderate",
    longevity: 7,
    projection: 6,
    time: ["day"],
    badges: []
  },

  eros: {
    profiles: ["fresh", "sweet", "woody"],
    occasion: ["night", "outdoor"],
    strength: "bold",
    longevity: 8,
    projection: 9,
    time: ["day", "night"],
    badges: ["FEATURED"]
  },

  missdior: {
    profiles: ["floral", "sweet"],
    occasion: ["day", "office", "night"],
    strength: "moderate",
    longevity: 7,
    projection: 6,
    time: ["day", "night"],
    badges: []
  },

  blackop: {
    profiles: ["sweet", "warm", "floral"],
    occasion: ["night"],
    strength: "bold",
    longevity: 9,
    projection: 8,
    time: ["night"],
    badges: ["FEATURED"]
  },

  valaya: {
    profiles: ["floral", "fresh"],
    occasion: ["day", "office"],
    strength: "subtle",
    longevity: 7,
    projection: 6,
    time: ["day"],
    badges: ["SIGNATURE"]
  },

  paradoxe: {
    profiles: ["floral", "warm"],
    occasion: ["office", "night"],
    strength: "moderate",
    longevity: 8,
    projection: 7,
    time: ["day", "night"],
    badges: ["SIGNATURE"]
  },

  eclat: {
    profiles: ["floral", "fresh"],
    occasion: ["day", "office"],
    strength: "subtle",
    longevity: 6,
    projection: 5,
    time: ["day"],
    badges: []
  }
};

export { PRODUCTS, PRODUCT_META };
