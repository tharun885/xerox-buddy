import "server-only";

import { createClient } from "@/lib/supabase/server";

export type UserRole = "STUDENT" | "OWNER" | "ADMIN";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, email, name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) return null;

  return {
    id: profile.user_id,
    email: profile.email,
    name: profile.name,
    role: profile.role as UserRole,
  };
}