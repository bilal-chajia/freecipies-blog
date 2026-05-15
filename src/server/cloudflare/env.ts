import { env } from "cloudflare:workers";
import type { Env } from "@shared/types";

type BindingName = keyof Pick<Env, "DB" | "IMAGES" | "SESSION">;

export const getCloudflareEnv = (): Env => env as Env;

export const getRequiredBinding = <Name extends BindingName>(
  name: Name,
): Env[Name] => {
  const binding = getCloudflareEnv()[name];
  if (!binding) {
    throw new Error(`Missing Cloudflare binding: ${name}`);
  }
  return binding;
};

export const getR2PublicUrl = (): string | undefined => {
  return getCloudflareEnv().R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL;
};

export const getSettingsCache = () => {
  const cloudflareEnv = getCloudflareEnv();
  return cloudflareEnv.SETTINGS_CACHE ?? cloudflareEnv.SESSION;
};
