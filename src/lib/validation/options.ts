export const shopStatuses = ["active", "closed", "unknown"] as const;

export const productTypes = [
  "standard_doener",
  "chicken_doener",
  "veal_doener",
  "gemuese_doener",
  "vegan_doener",
  "dueruem",
  "doener_box",
] as const;

export const sourceTypes = [
  "menu_photo",
  "manual_observation",
  "shop_website",
  "user_submission",
  "delivery_platform",
  "unknown",
] as const;

export const districtTypes = ["district", "borough"] as const;
