import { serve } from "std/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
};

serve(async (req) => {
    const { url, method } = req;

    // This is needed if you're planning to invoke your function from a browser.
    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Create a Supabase client.
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get("SUPABASE_URL") ?? "",
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: true } }
        );

        // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
        const ootoPattern = new URLPattern({ pathname: "/ooto-automation/:id" });
        const matchingPath = ootoPattern.exec(url);
        const id = matchingPath ? matchingPath.pathname.groups.id : null;

        let user = null;
        if (method === "POST") {
            // lookup user by id
            const { data, error } = await supabaseClient.auth.admin.getUserById(id);
            if (error) {
                throw error;
            }
            if (!data?.user) {
                throw new Error("User not found");
            } else {
                user = data.user;
            }
        }

        switch (true) {
            case method === "POST":
                const resp = await fetch("https://slack.com/api/chat.postMessage", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user.user_metadata.provider_token}`,
                    },
                    body: JSON.stringify({
                        channel: user.user_metadata.ooto_channel,
                        text: `In at ${DateTime.now()
                            .setZone(user.user_metadata.timezone)
                            .toLocaleString(DateTime.TIME_SIMPLE)}`,
                    }),
                });
                if (resp.status !== 200) {
                    throw new Error(`Slack API returned ${resp.status}`);
                } else {
                    return new Response(JSON.stringify(resp), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                        status: 200,
                    });
                }
            default:
                return new Response(JSON.stringify({ error: "Method not allowed" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 405,
                });
        }
    } catch (error) {
        console.error(error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
