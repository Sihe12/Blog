<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { inject } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const showLogin = ref(true) 

const user = inject('user');
const profilePic = inject('profilePic');
const loggedIn = inject('loggedIn');

// login form fields
const username = ref('')
const password = ref('')
const loginError = ref('')

// registration form fields
const regFirstname = ref('')
const regLastname = ref('')
const regUsername = ref('')
const regPassword = ref('')
const regError = ref('')
const regProfilePic = ref(null);
const regEmail = ref('')
const verifyEmail = ref(false)

// function to handle login
const login = async () => {
  try {
    const response = await axios.post('http://localhost:32000/api/login', {
      username: username.value,
      password: password.value,
    });
    
    if (response.data.success === true) {
      loggedIn.value = true;
      loginError.value = ''
      user.value = response.data.user

      if (response.data.profilePic) {
        const profilePicData = response.data.profilePic.data; 

        const uint8Array = new Uint8Array(profilePicData);
        const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');

        const base64String = btoa(binaryString);

        profilePic.value = `data:image/png;base64,${base64String}`; 
      }
      // store the JWT token (in localStorage or sessionStorage)
      localStorage.setItem('token', response.data.token);
      router.push({ name: 'Home' }); // redirect to the home page

    } else {
      loginError.value = 'Invalid username or password.'
    }
  } catch (error) {
    loginError.value = 'An error occurred while trying to login.'
  }
}

// function to handle registration
const register = async () => {
  // basic password check (at least 6 characters)
  if (regPassword.value.length < 6) {
    regError.value = 'Password must be at least 6 characters long.'
    return
  }
  try {
    const response = await axios.post('http://localhost:32000/api/register', {
      firstname: regFirstname.value,
      lastname: regLastname.value,
      email: regEmail.value,
      username: regUsername.value,
      profilePic: regProfilePic.value,
      password: regPassword.value,
    });

    if (response.data.success) {
      regError.value = 'Registration successful! You can now log in.'
      showLogin.value = true
    } else {
      regError.value = response.data.error || 'Registration failed.'
    }
  } catch (error) {
    regError.value = 'An error occurred during registration.'
    regError.value = error.response?.data?.error || error.message
  }
}

// function to handle file change
const onFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      // store the Base64 string in regProfilePic
      regProfilePic.value = reader.result; // this will be the Base64 string
    };
    reader.readAsDataURL(file); // read file as data URL (Base64)
  }
};
</script>

<template>
  <div id="logo">
    <img src="../assets/logo.png" alt="Logo" class="logo" />
  </div>

  <div v-if="showLogin" class="login-container">
    <h2 class="login-title">Login</h2>

    <div v-if="loginError" class="error">{{ loginError }}</div>

    <form @submit.prevent="login">
      <div class="input-group">
        <label for="username">Username</label>
        <input id="username" v-model="username" class="input-field" placeholder="Username" required />
      </div>

      <div class="input-group">
        <label for="password">Password</label>
        <input id="password" v-model="password" class="input-field" type="password" placeholder="Password" required />
      </div>

      <button type="submit" class="login-btn">Login</button>
    </form>

    <p class="register-switch">
      Don't have an account?
      <button @click="showLogin = false" class="register-btn">Register here</button>
    </p>
  </div>

  <div v-else class="register-container">
    <h2 class="register-title">Create Your Account</h2>
    <div v-if="regError" class="error">{{ regError }}</div>

    <form @submit.prevent="register">
      <div class="input-group">
        <label for="firstname">First Name</label>
        <input id="firstname" v-model="regFirstname" class="input-field" placeholder="Enter your first name" required />
      </div>

      <div class="input-group">
        <label for="lastname">Last Name</label>
        <input id="lastname" v-model="regLastname" class="input-field" placeholder="Enter your last name" required />
      </div>

      <div class="input-group">
        <label for="profile-pic">Profile Picture</label>
        <input 
          id="profile-pic" 
          type="file" 
          @change="onFileChange" 
          class="input-field" 
          accept="image/*" 
        />
      </div>

      <div class="input-group">
        <label for="email">Email</label>
        <input id="email" v-model="regEmail" class="input-field" placeholder="Enter email" required />
      </div>

      <div class="input-group">
        <label for="reg-username">Username</label>
        <input id="reg-username" v-model="regUsername" class="input-field" placeholder="Choose a username" required />
      </div>

      <div class="input-group">
        <label for="reg-password">Password</label>
        <input id="reg-password" v-model="regPassword" class="input-field" type="password" placeholder="Create a password" required />
      </div>

      <button type="submit" class="register-btn">Create Account</button>
    </form>

    <p class="login-switch">
      Already have an account?
      <button @click="showLogin = true" class="login-btn">Login here</button>
    </p>
  </div>
</template>



<style scoped>
.error {
  color: red;
  margin-bottom: 10px;
}
#logo {
  text-align: center;
  margin-top: 20px;
}
.logo {
    height: 7.2em;
    padding: 1.8em;
    will-change: filter;
    transition: filter 300ms;
  }

.register-container {
  text-align: center;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 2em;
  background-color: #2c2c2c;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.register-title {
  text-align: center;
  font-size: 1.8em;
  margin-bottom: 1em;
  color: #fff; 
}

.input-group {
  margin-bottom: 1.2em;
}

.input-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5em;
  color: #bbb; 
}

.input-field {
  margin: 0;
  width: 90%;
  padding: 0.75em;
  background-color: #3c3c3c; 
  color: #eaeaea; 
  border: 1px solid #555; 
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.3s, background-color 0.3s;
}

.input-field:focus {
  border-color: #42b883; 
  background-color: #484848;
  outline: none;
}

.register-btn {
  width: 100%;
  padding: 0.75em;
  background-color: #42b883; 
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  cursor: pointer;
  transition: background-color 0.3s;
}

.register-btn:hover {
  background-color: #37a77b;
}

.login-switch {
  text-align: center;
  margin-top: 1.5em;
  color: #bbb; 
}

.login-btn {
  background: none;
  border: none;
  color: #42b883;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.3s;
}

.login-btn:hover {
  color: #37a77b;
}

.error {
  background-color: #ff4d4f;
  color: white;
  padding: 0.75em;
  margin-bottom: 1.2em;
  border: 1px solid #ff7875;
  border-radius: 4px;
}

</style>
