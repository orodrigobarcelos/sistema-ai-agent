import { createClient } from "@supabase/supabase-js";
import { getCurrentUser, getUserSetup } from "./auth";
import { decrypt } from "./crypto";

export async function getStudentSupabase() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const setup = await getUserSetup(user.id);
  if (!setup) throw new Error("Setup not completed");

  const serviceRoleKey = decrypt(setup.supabase_service_role_key);
  return createClient(setup.supabase_url, serviceRoleKey);
}
