import { defineCollection, z } from "astro:content";

const varieties = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      sku: z.string().regex(/^DAH-[A-Z]+-\d{3}$/),
      price: z.number().positive(),
      stock: z.enum(["available", "low", "sold-out"]),
      category: z.enum([
        "dinnerplate",
        "ball",
        "pompon",
        "cactus",
        "decorative",
        "waterlily",
        "collarette",
        "anemone",
        "stellar",
        "single",
      ]),
      color: z.array(z.string()),
      bloomSize: z.string(),
      height: z.string(),
      image: image(),
    }),
});

export const collections = { varieties };
