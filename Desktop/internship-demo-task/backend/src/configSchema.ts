import { z } from "zod";

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  label: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

const entitySchema = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  fields: z.array(fieldSchema).default([]),
});

export const appConfigSchema = z.object({
  appName: z.string().min(1),
  auth: z
    .object({
      enabled: z.boolean().optional(),
      providers: z.array(z.string()).optional(),
    })
    .optional(),
  locales: z.array(z.string()).optional(),
  defaultLocale: z.string().optional(),
  entities: z.array(entitySchema).default([]),
  translations: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;