import { supabase } from "@/src/lib/supabase";

export const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const fetchWithAccessToken = async (input: string, init: RequestInit = {}) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No active session token.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
  });
};
