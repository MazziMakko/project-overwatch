import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  NEXT_PUBLIC_MAPLIBRE_TOKEN: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let cached: ValidatedEnv | null = null;

export function validateEnv(): ValidatedEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Environment validation failed: ${JSON.stringify(flat, null, 2)}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Dev-only: does not throw. Logs missing required vars so `next dev` can start
 * while you work on routes that do not need the full stack.
 */
export function warnIfEnvIncompleteInDevelopment(): void {
  if (process.env.NODE_ENV !== "development") return;
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return;
  const flat = parsed.error.flatten().fieldErrors;
  console.warn(
    "\n[Overwatch] Some required env vars are unset (development mode — dev server will still start). " +
      "Routes that need DB, Groq, or Clerk will fail until you set them in .env.local:\n",
    JSON.stringify(flat, null, 2),
    "\n",
  );
}

export function getEnv(): ValidatedEnv {
  return validateEnv();
}
