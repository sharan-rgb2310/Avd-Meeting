import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class RequestError extends Error {}
class AuthorizationError extends Error {}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const requiredText = (value: unknown, label: string, maxLength: number) => {
  if (typeof value !== "string" || !value.trim()) throw new RequestError(`${label} is required.`);
  const text = value.trim();
  if (text.length > maxLength) throw new RequestError(`${label} must be ${maxLength} characters or fewer.`);
  return text;
};

const optionalText = (value: unknown, label: string, maxLength: number) => {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new RequestError(`${label} must be text.`);
  const text = value.trim();
  if (text.length > maxLength) throw new RequestError(`${label} must be ${maxLength} characters or fewer.`);
  return text || null;
};

const validateRole = (value: unknown) => {
  if (typeof value !== "string") throw new RequestError("Enter a role.");
  const role = value.trim();
  if (role.length > 80) throw new RequestError("Role must be 80 characters or fewer.");
  if (!role) return null;
  return role.toLowerCase() === "admin" ? "Admin" : role;
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return jsonResponse({ error: "Sign in to manage your account." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("The account service is not configured.");
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return jsonResponse({ error: "Your session is invalid. Please sign in again." }, 401);
    const caller = callerData.user;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", caller.id)
      .maybeSingle();
    if (callerProfileError) throw callerProfileError;
    if (!callerProfile || callerProfile.status !== "Activated") {
      throw new AuthorizationError("This account is blocked or unavailable.");
    }
    const callerIsAdmin = callerProfile.role === "Admin";

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new RequestError("A valid account request is required.");
    }
    const payload = body as Record<string, unknown>;

    if (payload.action === "inviteUser") {
      if (!callerIsAdmin) throw new AuthorizationError("Only an administrator can invite workspace users.");
      const name = requiredText(payload.name, "Name", 120);
      const email = requiredText(payload.email, "Email", 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RequestError("Enter a valid email address.");
      const role = validateRole(payload.role);
      const department = optionalText(payload.department, "Department", 100);
      const title = optionalText(payload.title, "Job title", 120);
      const phone = optionalText(payload.phone, "Phone", 40);

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { name, role, department, title },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not create the invited account.");

      const { error: profileError } = await admin
        .from("profiles")
        .update({ name, role, status: "Invited", department, title, phone, updated_at: new Date().toISOString() })
        .eq("id", data.user.id);
      if (profileError) {
        const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
        if (cleanupError) console.error("Could not clean up an invitation whose profile update failed:", cleanupError);
        throw profileError;
      }

      return jsonResponse({ ok: true, userId: data.user.id });
    }

    if (payload.action === "updateSelf") {
      const name = requiredText(payload.name, "Name", 120);
      const role = validateRole(payload.role);
      if (!callerIsAdmin && role === "Admin") {
        throw new AuthorizationError("Only an existing administrator can assign Admin access from Profile settings.");
      }
      const department = optionalText(payload.department, "Department", 100);
      const title = optionalText(payload.title, "Job title", 120);
      const phone = optionalText(payload.phone, "Phone", 40);

      const { data, error } = await admin
        .from("profiles")
        .update({ name, role, department, title, phone, updated_at: new Date().toISOString() })
        .eq("id", caller.id)
        .select("id, email, name, role, status, department, title, phone, created_at")
        .single();
      if (error) throw error;
      return jsonResponse({ ok: true, profile: data });
    }

    if (payload.action === "updateUser") {
      if (!callerIsAdmin) throw new AuthorizationError("Only the workspace administrator can edit another account.");
      if (!isUuid(payload.userId)) throw new RequestError("Choose a valid user account.");
      const targetId = payload.userId;
      if (targetId === caller.id) throw new RequestError("Use the self-service profile action to edit your own account.");

      const { data: targetProfile, error: targetProfileError } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", targetId)
        .maybeSingle();
      if (targetProfileError) throw targetProfileError;
      if (!targetProfile) throw new RequestError("The selected account was not found.");

      const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(targetId);
      if (targetError) throw targetError;
      if (!targetData.user) throw new RequestError("The selected account was not found.");

      const name = requiredText(payload.name, "Name", 120);
      const role = validateRole(payload.role);
      const department = optionalText(payload.department, "Department", 100);
      const title = optionalText(payload.title, "Job title", 120);
      const phone = optionalText(payload.phone, "Phone", 40);

      const { data, error } = await admin
        .from("profiles")
        .update({ name, role, department, title, phone, updated_at: new Date().toISOString() })
        .eq("id", targetId)
        .select("id, email, name, role, status, department, title, phone, created_at")
        .single();
      if (error) throw error;
      return jsonResponse({ ok: true, profile: data });
    }

    if (payload.action === "blockUser" || payload.action === "unblockUser" || payload.action === "deleteUser") {
      if (!callerIsAdmin) throw new AuthorizationError("Only the workspace administrator can manage other accounts.");
      if (!isUuid(payload.userId)) throw new RequestError("Choose a valid user account.");
      const targetId = payload.userId;
      if (targetId === caller.id) throw new RequestError("You cannot block or delete your own account here.");

      const { data: targetProfile, error: targetProfileError } = await admin
        .from("profiles")
        .select("id, role, status")
        .eq("id", targetId)
        .maybeSingle();
      if (targetProfileError) throw targetProfileError;
      if (!targetProfile) throw new RequestError("The selected account was not found.");
      const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(targetId);
      if (targetError) throw targetError;
      if (!targetData.user) throw new RequestError("The selected account was not found.");

      if (payload.action === "deleteUser") {
        const wasAdmin = targetProfile.role === "Admin";
        if (wasAdmin) {
          const { error } = await admin
            .from("profiles")
            .update({ role: null, updated_at: new Date().toISOString() })
            .eq("id", targetId);
          if (error) throw error;
        }
        const { error } = await admin.auth.admin.deleteUser(targetId);
        if (error) {
          if (wasAdmin) {
            const { error: restoreError } = await admin
              .from("profiles")
              .update({ role: "Admin", updated_at: new Date().toISOString() })
              .eq("id", targetId);
            if (restoreError) console.error("Could not restore Admin role after account deletion failed:", restoreError);
          }
          throw error;
        }
        const { error: profileError } = await admin.from("profiles").delete().eq("id", targetId);
        if (profileError) {
          console.error("User account was deleted, but its directory profile could not be removed:", profileError);
          return jsonResponse({ ok: true, warning: "The account was deleted, but its directory profile needs cleanup." });
        }
        return jsonResponse({ ok: true });
      }

      const blocked = payload.action === "blockUser";
      const { error: authError } = await admin.auth.admin.updateUserById(targetId, {
        ban_duration: blocked ? "876000h" : "none",
      });
      if (authError) throw authError;

      const { error: statusError } = await admin
        .from("profiles")
        .update({ status: blocked ? "Inactive" : "Activated", updated_at: new Date().toISOString() })
        .eq("id", targetId);
      if (statusError) {
        const { error: rollbackError } = await admin.auth.admin.updateUserById(targetId, {
          ban_duration: blocked ? "none" : "876000h",
        });
        if (rollbackError) console.error("Could not roll back the Auth block after profile update failed:", rollbackError);
        throw statusError;
      }
      return jsonResponse({ ok: true, status: blocked ? "Inactive" : "Activated" });
    }

    if (payload.action === "deleteSelf") {
      const wasAdmin = callerProfile.role === "Admin";
      if (wasAdmin) {
        const { error } = await admin
          .from("profiles")
          .update({ role: null, updated_at: new Date().toISOString() })
          .eq("id", caller.id);
        if (error) throw error;
      }
      const { error } = await admin.auth.admin.deleteUser(caller.id);
      if (error) {
        if (wasAdmin) {
          const { error: restoreError } = await admin
            .from("profiles")
            .update({ role: "Admin", updated_at: new Date().toISOString() })
            .eq("id", caller.id);
          if (restoreError) console.error("Could not restore Admin role after self-deletion failed:", restoreError);
        }
        throw error;
      }

      const { error: profileError } = await admin.from("profiles").delete().eq("id", caller.id);
      if (profileError) {
        console.error("Account was deleted, but its directory profile could not be removed:", profileError);
        return jsonResponse({ ok: true, warning: "Your account was deleted, but its directory profile needs cleanup." });
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown account action." }, 400);
  } catch (error) {
    console.error("Account operation failed:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "The account operation failed." },
      error instanceof AuthorizationError ? 403 : error instanceof RequestError ? 400 : 500,
    );
  }
});
