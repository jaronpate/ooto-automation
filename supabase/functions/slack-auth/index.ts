import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

function errorResponse(error: any) {
    return new Response(JSON.stringify({ error }), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 500,
    });
}

serve(async (req) => {
    // get the code from the query string
    const code = new URLSearchParams(req.url.split("?")[1]).get("code");
    // exchange the code for an access token
    const slack_auth_res = await fetch(
        `https://slack.com/api/oauth.v2.access?code=${code}&client_id=${Deno.env.get(
            "SLACK_CLIENT_ID"
        )}&client_secret=${Deno.env.get("SLACK_CLIENT_SECRET")}&redirect_uri=${Deno.env.get("SLACK_REDIRECT_URI")}`
    );

    // get the access token from the response
    const slack_auth_body = await slack_auth_res.json();
    const { authed_user } = slack_auth_body;

    const slack_test_res = await fetch(`https://slack.com/api/users.info`, {
        method: "POST",
        body: `user=${authed_user.id}`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${authed_user.access_token}`,
        },
    });

    // get the user info from the response
    const slack_test_body = await slack_test_res.json();
    const { user } = slack_test_body;

    // create supabase client
    const supabaseClient = createClient(
        // Supabase API URL - env var exported by default.
        Deno.env.get("SUPABASE_URL") ?? "",
        // Supabase API ANON KEY - env var exported by default.
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // check for an existing identifier
    const { data: users, error: users_error } = await supabaseClient
        .from("identifiers")
        .select("*")
        .eq("external_id", user.id);

    if (users_error) {
        throw users_error;
        // return errorResponse(users_error);
    }

    // if the user exists, update the provider token
    if (users && users.length > 0) {
        const { updated_user, error } = await supabaseClient.auth.admin.updateUserById(users[0].supabase_id, {
            password: authed_user.access_token,
            data: {
                provider_token: authed_user.access_token,
            },
        });

        if (error) {
            return errorResponse(error);
        }

        // generate a new refresh token
        const { data: refresh_token_data, error: refresh_token_error } = await supabaseClient.signInWithPassword({
            email: updated_user.email,
            password: authed_user.access_token,
        });

        if (refresh_token_error) {
            return errorResponse(refresh_token_error);
        }

        // redirect to the app with the access token
        return new Response(JSON.stringify({ user: authed_user }), {
            headers: {
                Location: `${
                    Deno.env.get("DEV_MODE")
                        ? "http://localhost:5173/config"
                        : "https://ooto-automation.vercel.app/config"
                }?token=${refresh_token_data[0].session.refresh_token}`,
            },
            status: 302,
        });
    }

    // create a new user in the database
    const { data, error } = await supabaseClient.auth.signUp({
        email: user.profile.email,
        password: authed_user.access_token,
        options: {
            data: {
                provider_token: authed_user.access_token,
                provider_user_id: authed_user.id,
                provider: "slack",
                timezone: user.tz,
                name: user.name,
                image_url: user.profile.image_512,
            },
        },
    });

    if (error) {
        return errorResponse(error);
    }

    // add an identifier for the user
    const { error: identifier_error } = await supabaseClient.from("identifiers").insert([
        {
            supabase_id: data.user.id,
            external_id: user.id,
        },
    ]);

    if (identifier_error) {
        return errorResponse(identifier_error);
    }

    // redirect to the app with the access token
    return new Response(JSON.stringify({ user: authed_user }), {
        headers: {
            Location: `${
                Deno.env.get("DEV_MODE") ? "http://localhost:5173/config" : "https://ooto-automation.vercel.app/config"
            }?token=${data.session.refresh_token}`,
        },
        status: 302,
    });
});
