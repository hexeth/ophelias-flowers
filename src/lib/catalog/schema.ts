import { z } from "zod";
import {
  CATALOG_PLACEHOLDER_IMAGE,
  STOCK_STATUSES,
  VARIETY_CATEGORIES,
} from "./constants";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuPattern = /^DAH-[A-Z0-9]+-\d{3}$/;

const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const varietyInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().min(1).regex(slugPattern).optional(),
    name: z.string().trim().min(1),
    sku: z.string().trim().regex(skuPattern).optional(),
    description: z.string().trim().min(1),
    price: z.coerce.number().finite().nonnegative(),
    salePrice: nullableString.transform((value) =>
      value === null ? null : Number(value),
    ),
    stock: z.enum(STOCK_STATUSES),
    category: z.enum(VARIETY_CATEGORIES),
    color: z
      .array(z.string().trim().min(1))
      .min(1)
      .transform((colors) =>
        [...new Set(colors.map((color) => color.toLowerCase()))].sort(),
      ),
    bloomSize: z.string().trim().min(1),
    height: z.string().trim().min(1),
    imageUrl: nullableString.transform(
      (value) => value ?? CATALOG_PLACEHOLDER_IMAGE,
    ),
    imageKey: nullableString,
    hidden: z.coerce.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.salePrice !== null) {
      if (!Number.isFinite(value.salePrice) || value.salePrice < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sale price must be a valid positive amount.",
          path: ["salePrice"],
        });
      }

      if (value.salePrice > value.price) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sale price must be less than or equal to the base price.",
          path: ["salePrice"],
        });
      }
    }
  });

export type VarietyInput = z.infer<typeof varietyInputSchema>;

export function parseVarietyInput(payload: unknown) {
  return varietyInputSchema.parse(payload);
}
