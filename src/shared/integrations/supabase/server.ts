import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

function getSupabaseSecret() {
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseSecret());
}

export function createAdminSupabaseClient(fetchImplementation?: typeof fetch): SupabaseClient | null {
  const url = getSupabaseUrl();
  const secret = getSupabaseSecret();
  if (!url || !secret) return null;

  return createClient(url, secret, {
    ...(fetchImplementation ? { global: { fetch: fetchImplementation } } : {}),
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createPublicSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
