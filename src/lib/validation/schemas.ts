import { z } from "zod";

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

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase dash-separated id");

const requiredTextSchema = z.string().trim().min(1);

const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const optionalUrlSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .pipe(z.url().optional())
  .optional();

export function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const isoDateSchema = z.string().refine(isIsoDate, {
  message: "Use an ISO date in YYYY-MM-DD format",
});

export const shopSchema = z.object({
  id: slugSchema,
  name: optionalTextSchema,
  address: requiredTextSchema,
  district: requiredTextSchema,
  borough: requiredTextSchema,
  lat: z.number().min(52.3).max(52.7),
  lng: z.number().min(13.0).max(13.8),
  osmUrl: optionalUrlSchema,
  websiteUrl: optionalUrlSchema,
  status: z.enum(shopStatuses),
});

export const shopsSchema = z.array(shopSchema);

export const priceRecordSchema = z.object({
  id: slugSchema,
  shopId: slugSchema,
  observedAt: isoDateSchema,
  priceCents: z.number().int().min(100).max(5000),
  productType: z.enum(productTypes),
  sourceType: z.enum(sourceTypes),
  confidence: z.number().int().min(0).max(100),
  sourceUrl: optionalUrlSchema,
  notes: optionalTextSchema,
});

export const priceRecordsSchema = z.array(priceRecordSchema);

export const priceRecordCsvRowSchema = z.object({
  id: slugSchema,
  shopId: slugSchema,
  observedAt: isoDateSchema,
  priceCents: z.coerce.number().int().min(100).max(5000),
  productType: z.enum(productTypes),
  sourceType: z.enum(sourceTypes),
  confidence: z.coerce.number().int().min(0).max(100),
  sourceUrl: optionalUrlSchema,
  notes: optionalTextSchema,
});

export const districtSchema = z.object({
  id: slugSchema,
  name: requiredTextSchema,
  type: z.enum(districtTypes),
  borough: optionalTextSchema,
});

export const districtsSchema = z.array(districtSchema);

export type Shop = z.infer<typeof shopSchema>;
export type PriceRecord = z.infer<typeof priceRecordSchema>;
export type District = z.infer<typeof districtSchema>;
