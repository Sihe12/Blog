<script setup>
import { ref, onMounted, provide } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import NavComponent from './components/NavComponent.vue';
import LLM from './components/LLM.vue';

const router = useRouter();
const user = ref(null);
const profilePic = ref(null);
const loggedIn = ref(false);

const decodeJWT = (token) => {
  if (!token) return null;
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

// Check token on mounted
onMounted(async () => {
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = decodeJWT(token);
    user.value = {
      userId: decoded.userId,
      firstname: decoded.firstname,
      lastname: decoded.lastname,
      username: decoded.username,
      email: decoded.email,
    };
    console.log('User logged in:', user.value);
    loggedIn.value = true;

    let config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    let response = await axios.post('http://localhost:32000/api/getProfilePic', {
      UserID: user.value.userId,
    }, config);

    if (response.data.success && response.data.profilePic) {
      const profilePicData = response.data.profilePic.data;
      const uint8Array = new Uint8Array(profilePicData);
      const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
      const base64String = btoa(binaryString);
      profilePic.value = `data:image/png;base64,${base64String}`;
    }
    router.push({ name: 'Home' });  // Redirect to showcase if token is found
  } else {
    router.push({ name: 'Login' });  // Redirect to login if no token
  }
});

// Provide variables globally
provide('user', user);
provide('profilePic', profilePic);
provide('loggedIn', loggedIn);
</script>

<template>
  <NavComponent v-if="loggedIn" v-model:loggedIn="loggedIn" v-model:user="user" v-model:profilePic="profilePic"/>

  <router-view></router-view>  <!-- This will render components based on routes -->

  <div v-if="loggedIn" class="llm">
    <LLM />
  </div>
</template>

<style scoped>
.llm {
  max-width: 25%;
  position: fixed;
  bottom: 0;
  right: 0;
  margin: 10px;
  z-index: 1000;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>