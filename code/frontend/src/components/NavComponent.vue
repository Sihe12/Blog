<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = defineModel('user');
const profilePic = defineModel('profilePic');

const searchInput = ref('');

const goToProfile = () => {
  console.log('Navigating to profile page');
  router.push({ name: 'Profile' }); // navigate to the profile page
}

// new function to handle friend search
const searchFriends = () => {
  console.log('Searching for:', searchInput.value);
  router.push({ name: 'AddFriends', query: { name: searchInput.value } }); // navigate to the search results page
};
</script>

<template>
  <div style="margin-bottom: 10%;">
    <!-- Navigation bar -->
    <nav class="navbar">
      <!-- Searchbar for friends -->
      <div class="navbar-left">
        <input 
          class="search-friends-input" 
          type="text" 
          placeholder="Search for friends" 
          v-model="searchInput"
        />
        <button class="search-friends-button" @click="searchFriends">Search</button> 
      </div>
      <div class="navbar-center">
      <router-link to="/home">
        <img src="../assets/logo.png" alt="Logo" class="logo" />
      </router-link>
      <router-link to="/home">
        <span class="blog-title">Blog</span>
      </router-link>
    </div>

      <!-- Profile picture or default icon on the right -->
      <div class="navbar-right">
        <div v-if="user" class="profile-container">
          <img
            v-if="profilePic!=='' && profilePic!==null"
            :src="profilePic"
            alt="Profile Picture"
            class="profile-pic"
            @click="goToProfile"
          />
          <img
            v-else
            src="https://www.w3schools.com/w3images/avatar2.png"
            alt="Default User Icon"
            class="default-user-icon"
            @click="goToProfile"
          />
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 10px 20px;
  background-color: #333;
  color: #fff;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  box-sizing: border-box; 
}

.navbar-left {
  position: absolute;
  left: 20px; 
}

.navbar-center {
  display: flex;
  align-items: center;
  flex-grow: 1; 
  justify-content: center; 
}

.logo {
  height: 60px; 
  margin-right: 10px;
}

.blog-title {
  font-size: 40px;
  font-weight: bold;
  color: #fff;
}


.navbar-right {
  position: absolute; 
  right: 20px; 
  display: flex;
  align-items: center;
  margin-left: auto;
}

.search-friends-button {
  margin-left: 10px;
  size: 10px;
}

.search-friends-input {
  padding: 5px;
}

.profile-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.profile-pic,
.default-user-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.profile-pic:hover,
.default-user-icon:hover {
  transform: scale(1.1);
}

@media (max-width: 600px) {
  .blog-title {
    font-size: 24px;
  }

  .logo {
    height: 40px;
  }
}
</style>
