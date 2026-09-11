import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./env.mjs";

export function getSupabaseConfig() {
  loadEnvFile();
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    publishable: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function createScriptSupabaseClient(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
