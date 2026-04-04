export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnv, warnIfEnvIncompleteInDevelopment } = await import(
    "@/lib/validateEnv"
  );

  // Do not block local dev when .env.local is incomplete — production builds
  // still fail fast via validateEnv() so deploys cannot start half-configured.
  if (process.env.NODE_ENV === "development") {
    warnIfEnvIncompleteInDevelopment();
    return;
  }

  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return;
  }

  validateEnv();
}
