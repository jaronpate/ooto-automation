<script setup>
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
    <RouterView />
</template>

<script>
export default {
    name: "App",
    components: {
        RouterLink,
        RouterView,
    },
    methods: {
        async logout() {
            const { error } = await this.$supabase.auth.signOut();
            if (!error) {
                this.$router.push({ name: "login" });
            }
        },
    },
};
</script>

<style scoped>
.logout {
    position: absolute;
    top: 8px;
    right: 8px;
    cursor: pointer;
    width: fit-content;
}
</style>
