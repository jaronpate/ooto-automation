import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import { createClient } from "@supabase/supabase-js";
import axios from "axios";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

// Initialize Supabase
const SUPABASE_URL =
    process.env.NODE_ENV === "development" ? "http://localhost:54321" : "https://cbrtigdzyikloutoeyqv.supabase.co";
const SUPABASE_ANON_KEY =
    process.env.NODE_ENV === "development"
        ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
        : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicnRpZ2R6eWlrbG91dG9leXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODgwOTc1MTUsImV4cCI6MjAwMzY3MzUxNX0._FEP3iqGnCLO_iA_No8aJ4REGLkMLECAIcW86QeqmJ0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make Supabase available to the application
app.config.globalProperties.$supabase = supabase;

// Initialize Slack API
const slack = axios.create({
    baseURL: "https://slack.com/api/",
    timeout: 1000,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
    },
});

// Add Slack token to requests
slack.interceptors.request.use(async (request) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        return request;
    } else if (request.method === "post") {
        const token = data.session.user.user_metadata.provider_token;
        if (request.data instanceof FormData) {
            request.data.append("token", token);
        } else {
            request.data = new FormData();
            request.data.append("token", token);
        }
    }

    return request;
});

// Make Slack API available to the application
app.config.globalProperties.$slack = slack;

// Create generic axios instance
const axiosInstance = axios.create();

// Make axios available to the application
app.config.globalProperties.$axios = axiosInstance;

// Initialize state
app.use(createPinia());
// Add router
app.use(router);

app.mount("#app");
