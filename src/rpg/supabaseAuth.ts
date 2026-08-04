import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RpgIdentity = {
  accessToken: string;
  userId: string;
  mode: "supabase" | "guest";
};

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  ""
).trim();

let client: SupabaseClient | null = null;

function getClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export async function getRpgIdentity(): Promise<RpgIdentity> {
  const supabase = getClient();
  if (!supabase) return { accessToken: "", userId: "", mode: "guest" };

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    return {
      accessToken: sessionData.session.access_token,
      userId: sessionData.session.user.id,
      mode: "supabase",
    };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    console.warn("Supabase anonymous sign-in failed; continuing as a local guest.", error?.message ?? "No session returned");
    return { accessToken: "", userId: "", mode: "guest" };
  }

  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
    mode: "supabase",
  };
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}
