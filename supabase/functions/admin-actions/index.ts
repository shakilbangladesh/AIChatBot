import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: super_admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, userId, packageId, role: newRole } = body;

    switch (action) {
      case "update_package": {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ package_id: packageId })
          .eq("id", userId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_role": {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ role: newRole || "tenant" })
          .eq("id", userId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "ban_user": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unban_user": {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_limits": {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ package_id: 1 })
          .eq("id", userId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_all_users": {
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, role, package_id, created_at, packages(name, price)")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const { data: { users: authUsers }, error: authListErr } =
          await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (authListErr) throw authListErr;

        const merged = (profiles || []).map((p: any) => {
          const authUser = authUsers?.find((u: any) => u.id === p.id);
          return {
            ...p,
            email: authUser?.email || "unknown",
            banned: authUser?.banned_until
              ? new Date(authUser.banned_until) > new Date()
              : false,
          };
        });

        return new Response(
          JSON.stringify({ users: merged }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_global_stats": {
        const { count: totalUsers } = await supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true });

        const { count: totalBots } = await supabaseAdmin
          .from("bot_settings")
          .select("*", { count: "exact", head: true });

        const { count: totalLeads } = await supabaseAdmin
          .from("bot_leads")
          .select("*", { count: "exact", head: true });

        const { data: paidProfiles } = await supabaseAdmin
          .from("profiles")
          .select("package_id, packages(price)")
          .neq("package_id", 1);

        let mrr = 0;
        let paidTenants = 0;
        for (const row of paidProfiles || []) {
          const price = Number((row as any).packages?.price || 0);
          if (price > 0) {
            mrr += price;
            paidTenants += 1;
          }
        }

        return new Response(
          JSON.stringify({
            totalUsers: totalUsers || 0,
            totalBots: totalBots || 0,
            totalLeads: totalLeads || 0,
            mrr,
            paidTenants,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_tenant_details": {
        const { data: profile, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name, role, package_id, created_at, packages(name, price, bot_limit, lead_limit)")
          .eq("id", userId)
          .maybeSingle();
        if (profErr) throw profErr;

        const { data: botSettings } = await supabaseAdmin
          .from("bot_settings")
          .select("bot_name, welcome_message, theme_color, created_at")
          .eq("client_id", userId)
          .maybeSingle();

        const { data: kb } = await supabaseAdmin
          .from("knowledge_base")
          .select("content, updated_at")
          .eq("client_id", userId)
          .maybeSingle();

        const { count: leadsCount } = await supabaseAdmin
          .from("bot_leads")
          .select("*", { count: "exact", head: true })
          .eq("client_id", userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: newLeadsToday } = await supabaseAdmin
          .from("bot_leads")
          .select("*", { count: "exact", head: true })
          .eq("client_id", userId)
          .gte("created_at", today.toISOString());

        const { data: recentLeads } = await supabaseAdmin
          .from("bot_leads")
          .select("id, name, email, phone, service_requested, status, created_at")
          .eq("client_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        const kbContent: string = kb?.content || "";
        const kbPreview = kbContent.slice(0, 600);

        return new Response(
          JSON.stringify({
            profile,
            bot_settings: botSettings,
            knowledge_base: {
              preview: kbPreview,
              char_count: kbContent.length,
              word_count: kbContent.trim() ? kbContent.trim().split(/\s+/).length : 0,
              updated_at: kb?.updated_at || null,
            },
            stats: {
              leads_count: leadsCount || 0,
              new_leads_today: newLeadsToday || 0,
              has_bot: !!botSettings,
              has_knowledge: kbContent.length > 0,
            },
            recent_leads: recentLeads || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
