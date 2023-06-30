<template>
    <div class="config flex flex-align flex-justify flex-column" v-if="user && info">
        <div class="section flex flex-align flex-row">
            <div class="flex flex-align flex-row">
                <img class="pfp" :src="user.user_metadata.avatar_url" />
                <div class="info flex flex-column">
                    <div class="email">{{ user.email }}</div>
                    <div class="subtext">
                        <span class="username">({{ info.user }}</span> in
                        <span class="workspace">{{ info.team }})</span>
                    </div>
                </div>
            </div>
            <div class="ff"></div>
            <div>
                <button class="logout" @click="logout">Logout</button>
            </div>
        </div>
        <div class="section form flex flex-column">
            <div class="section-header">Settings</div>
            <label for="channel">Channel to post OOTO Message:</label>
            <select v-model="ooto_channel">
                <option v-for="channel in channels" :value="channel.id" :key="channel.id">
                    {{ channel.name }}
                </option>
            </select>
            <label for="format">Format of OOTO Message:</label>
            <select v-model="ooto_message_format">
                <option v-for="format in formats" :value="format.value" :key="format.value">
                    {{ format.label }}
                </option>
            </select>
            <label for="format">Timezone:</label>
            <select v-model="timezone">
                <option v-for="zone in timezones" :value="zone.value" :key="zone.value">
                    {{ zone.label }}
                </option>
            </select>
            <button @click="save()">Save</button>
        </div>
        <div class="section flex flex-column">
            <div class="section-header">Info</div>
            <label for="format">Webhook URL:</label>
            <div class="flex flex-align flex-row">
                <input
                    type="text"
                    class="monospace"
                    placeholder="Webhook URL"
                    readonly
                    v-model="ooto_webhook_url"
                    ref="ooto_webhook"
                    @click="highlightInput('ooto_webhook')"
                />
                <button class="copy" @click="clipboard(ooto_webhook_url)">Copy</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "Config",
    components: {},
    data() {
        return {
            user: null,
            info: null,
            channels: [],
            formats: [
                {
                    value: "h:mm",
                    label: "9:30",
                },
                {
                    value: "h:mm a",
                    label: "9:30 am",
                },
                {
                    value: "h:mm A",
                    label: "9:30 AM",
                },
                {
                    value: "hh:mm",
                    label: "09:30",
                },
                {
                    value: "hh:mm a",
                    label: "09:30 am",
                },
                {
                    value: "hh:mm A",
                    label: "09:30 AM",
                },
            ],
            timezones: [],
            timezone: null,
            ooto_channel: null,
            ooto_message_format: null,
            ooto_webhook_url: null,
        };
    },
    async created() {
        // fetch timezones
        const { data: timezones } = await this.$axios.get("https://worldtimeapi.org/api/timezone");
        this.timezones = timezones.map((timezone) => {
            return {
                value: timezone,
                label: timezone,
            };
        });

        const { data, error } = await this.$supabase.auth.getSession();
        if (data.session) {
            console.log(data);

            if (data.session.provider_token) {
                const { error } = await this.$supabase.auth.updateUser({
                    data: {
                        provider_token: data.session.provider_token,
                    },
                });
            }

            this.user = data.session.user;

            this.timezone = this.user.user_metadata.timezone;
            this.ooto_channel = this.user.user_metadata.ooto_channel;
            this.ooto_message_format = this.user.user_metadata.ooto_message_format;
            // this.ooto_webhook_url = `${window.location.origin}/api/ooto/${this.user.id}`;
            this.ooto_webhook_url = `https://cbrtigdzyikloutoeyqv.supabase.co/functions/v1/ooto-automation/${this.user.id}`;

            const { data: info } = await this.$slack.post("auth.test");

            if (info.ok) {
                console.log(info);
                this.info = info;
            }

            const { data: response } = await this.$slack.post("conversations.list");

            if (response.ok) {
                console.log(response.channels);
                this.channels = response.channels;
            }
        } else {
            this.$router.push({ name: "login" });
        }
    },
    methods: {
        clipboard(text) {
            navigator.clipboard.writeText(text);
        },
        highlightInput(ref) {
            this.$refs[ref].select();
        },
        async logout() {
            const { error } = await this.$supabase.auth.signOut();
            if (!error) {
                this.$router.push({ name: "login" });
            }
        },
        async save() {
            console.log(this.ooto_channel, this.ooto_message_format);
            const { data, error } = await this.$supabase.auth.updateUser({
                data: {
                    ooto_channel: this.ooto_channel,
                    ooto_message_format: this.ooto_message_format,
                    timezone: this.timezone,
                },
            });
            console.log(data, error);
        },
    },
};
</script>

<style scoped>
.logout {
    background: #ff2626;
}

.logout:hover {
    background: #ff4949;
}

.pfp {
    width: 25px;
    height: 25px;
    border-radius: 50%;
    margin-right: 10px;
}

.info {
    font-size: 12px;
    color: #333;
}

.subtext {
    font-size: 11px;
    color: #666;
    font-style: italic;
}

.email {
    font-size: 16px;
    font-weight: bold;
}

.username {
    /* font-weight: bold; */
}

.workspace {
    /* font-style: italic; */
}

.config {
    min-height: 100vh;
    display: flex;
    align-items: center;
}

.section {
    margin-bottom: 25px;
    min-width: 350px;
}

.section:last-child {
    margin-bottom: 0;
}

.section-header {
    font-size: 20px;
    line-height: 22px;
    font-weight: bold;
    margin-bottom: 10px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
    /* font-style: italic; */
    color: #333;
}

input,
select {
    width: 100%;
}

button {
    /* width: 100%; */
    width: fit-content;
}

.copy {
    margin-left: 5px;
}
</style>
