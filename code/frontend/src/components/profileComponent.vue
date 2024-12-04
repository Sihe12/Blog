<script setup>
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios'
import { toast } from 'vue3-toastify'

const user = inject('user');
const profilePic = inject('profilePic');
const loggedIn = inject('loggedIn');
const router = useRouter();

const showChangePassword = ref(false); // state to show/hide password fields
const newProfilePic = ref(null);
const newPassword = ref('');
const oldPassword = ref('');
const showUpload = ref(false);
const incomingRequests = ref([]);
const errorMessage = ref('');

const getTokenConfig = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    errorMessage.value = 'Authentication token not found. Please log in.';
    return null;
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Function to handle picture upload
const handleProfilePicChange = async (event) => {
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onloadend = async () => {
            // Store the Base64 string in newProfilePic
            newProfilePic.value = reader.result; // This will be the Base64 string

            // Make API call to upload profile picture
            try {
                const config = getTokenConfig();
                if (!config) {
                    toast.error('Authentication token not found. Please log in.');
                    return; // Stop if no token is found
                }

                const response = await axios.post('http://localhost:32000/api/updateProfilePic', {
                    UserID: user.value.userId,
                    profilePic: newProfilePic.value,
                }, config);
                
                if (response.data.success) {
                    const profilePicData = response.data.profilePic.data; // Access the data array

                    // Convert the data into a Base64 string
                    const uint8Array = new Uint8Array(profilePicData);
                    const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
                    const base64String = btoa(binaryString);

                    // Set the profile picture with the Base64 string
                    profilePic.value = `data:image/png;base64,${base64String}`;
                    toast.success("Profile picture updated successfully")
                } else {
                    toast.error(response.data.error || 'Failed to upload profile picture.');
                }
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                toast.error(error.response?.data?.error || error.message);
            }
        };

        // Read file as data URL (Base64)
        reader.readAsDataURL(file); 
    } else {
        toast.error('No file selected.');
    }
};

// Function to handle password change
const changePassword = async () => {
    // Make API call to change password
    try {
        const config = getTokenConfig();
        if (!config) return; // Stop if no token is found
        const response = await axios.post('http://localhost:32000/api/changePassword', {
            UserID: user.value.userId,
            oldPassword: oldPassword.value,
            newPassword: newPassword.value,
        }, config);
        if (response.data.success) {
            toast.success('Password changed successfully!');
            newPassword.value = ''; // Clear the password input
        } else {
            toast.error(response.data.error || 'Failed to change password.');
        }
        } catch (error) {
            toast.error((error.response?.data?.error || error.message));
    }
};


// friend handling functions

// Get friend requests for the logged-in user
const getIncomingRequests = async () => {
  try {
      const config = getTokenConfig();
      if (!config) return;
      console.log("getting incoming requests")

      const response = await axios.post('http://localhost:32000/api/incomingFriendRequests', {}, config);
      
      console.log(response.data.incomingRequests)
      
      for (const request of response.data.incomingRequests) {
          const username = await getUsername(request.UserID);
          request.Username = username;
      }

      if (response.data.success) {
        incomingRequests.value = Array.isArray(response.data.incomingRequests) ? response.data.incomingRequests : [];
        console.log(incomingRequests.value)
      } else {
        errorMessage.value = 'Failed to fetch incoming requests.';
      }
  } catch (error) {
      errorMessage.value = 'Error fetching incoming requests: ' + (error.response?.data?.error || error.message);
      console.error(errorMessage.value);
  }
};

const getUsername = async (userId) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/getUsername', { 
      UserID: userId 
    }, config);

    if (response.data.success) {
      return response.data.username;
    } else {
      errorMessage.value = 'Failed to fetch username.';
    }
  } catch (error) {
    errorMessage.value = 'Error fetching username: ' + (error.response?.data?.error || error.message);
    console.error(errorMessage.value);
  }
};

// Function to accept a friend request
const respondFriendRequest = async (friendId, answer) => {
  console.log(answer, " friend", friendId) 
  try {
    const config = getTokenConfig();
    if (!config) return;

    if (answer === 'Accept') {
      const response = await axios.post('http://localhost:32000/api/respondFriendRequest', {
        userId: user.value.userId,  // Current logged-in user
        friendId: friendId,
        action: 'accept'
      }, config);

      if (response.data.success) {
        await getIncomingRequests();  // Refresh the incoming requests list after action
      } else {
        errorMessage.value = 'Failed to accept friend request.';
      }
    } else if (answer === 'Decline') {
      const response = await axios.post('http://localhost:32000/api/respondFriendRequest', {
        userId: user.value.userId,  // Current logged-in user
        friendId: friendId,
        action: 'decline'
      }, config);

      if (response.data.success) {
        await getIncomingRequests();  // Refresh the incoming requests list after action
      } else {
        errorMessage.value = 'Failed to decline friend request.';
      }
    } else if (answer === 'Blocked') {
      const response = await axios.post('http://localhost:32000/api/respondFriendRequest', {
        userId: user.value.userId,  // Current logged-in user
        friendId: friendId,
        action: 'block'
      }, config);

      if (response.data.success) {
        await getIncomingRequests();  // Refresh the incoming requests list after action
      } else {
        errorMessage.value = 'Failed to block friend.';
      }
    }
  } catch (error) {
    errorMessage.value = 'Error accepting friend request: ' + (error.response?.data?.error || error.message);
    console.error(errorMessage.value);
  }
};

// Function to decline a friend request
const declineFriend = async (friendId, answer) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/respondFriendRequest', {
      userId: user.value.userId,  // Current logged-in user
      friendId: friendId,
      action: 'decline'
    }, config);

    if (response.data.success) {
      await getIncomingRequests();  // Refresh the incoming requests list after action
    } else {
      errorMessage.value = 'Failed to decline friend request.';
    }
  } catch (error) {
    errorMessage.value = 'Error declining friend request: ' + (error.response?.data?.error || error.message);
    console.error(errorMessage.value);
  }
};

// Log out the user
const logOut = () => {
    user.value = null
    loggedIn.value = false
    localStorage.removeItem('token')
    errorMessage.value = ''; // Clear any error messages
    profilePic.value = null; // Clear the profile picture
    router.push({ name: 'Login' }); // Redirect to login page
}

getIncomingRequests();

</script>

<template>
  <div class="profile-page">
    <!-- Profile Picture Section -->
    <div class="profile-header">
      <img
        v-if="newProfilePic && newProfilePic !== ''"
        :src="newProfilePic"
        alt="Profile Picture"
        class="profile-picture"
      />
      <img
        v-else-if="profilePic && profilePic !== ''"
        :src="profilePic"
        alt="Profile Picture"
        class="profile-picture"
      />
      <img
        v-else
        src="https://www.w3schools.com/w3images/avatar2.png"
        alt="Default Profile Picture"
        class="profile-picture"
      />
      <div class="upload-section">
        <input type="file" accept="i
        mage/*" @change="handleProfilePicChange" />
      </div>
    </div>
    <div>
      <h3>You have {{ incomingRequests.length }} new friend request(s)</h3>
      <div v-for="request in incomingRequests" :key="request.UserID">
        <p>Friend request {{ request.Username }}</p>
        <button @click="respondFriendRequest(request.UserID, answer='Accept')">Accept</button>
        <button @click="respondFriendRequest(request.UserID, answer='Decline')">Decline</button>
        <button @click="respondFriendRequest(request.UserID, answer='Blocked')">Block</button>
      </div>
    </div>

    <!-- User Information Section -->
    <div class="profile-details">
      <h1>{{ user?.firstname }} {{ user?.lastname }}</h1>
      <p><strong>Username:</strong> {{ user?.username }}</p>

      <!-- Change Password Section -->
      <div class="change-password">
        <button @click="showChangePassword = !showChangePassword" class="change-password-btn">
            {{ showChangePassword ? 'Hide' : 'Change Password' }}
        </button>

        <div v-if="showChangePassword" class="password-fields">
          <input
            type="password"
            v-model="oldPassword"
            placeholder="Enter old password"
            class="password-input"
          />
          <input
            type="password"
            v-model="newPassword"
            placeholder="Enter new password"
            class="password-input"
          />
          <button @click="changePassword" class="submit-password-btn">Submit</button>
        </div>

        <!-- Message to show feedback -->
        <p v-if="message" class="feedback-message">{{ message }}</p>
      </div>
    </div>
    <br>
    <div class="logOut">
      <button @click="logOut">Log Out</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  padding: 20px;
}

.profile-header {
  margin-bottom: 20px;
}

.profile-picture {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 20px;
}

.upload-section {
  margin-top: 10px;
}

.profile-details {
  text-align: left;
  margin-top: 20px;
}

.profile-details h1 {
  font-size: 2rem;
  margin-bottom: 10px;
}

.profile-details p {
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.change-password {
  margin-top: 20px;
}

.password-input {
  padding: 10px;
  width: 80%;
  margin-bottom: 10px;
}

.change-password-btn {
  padding: 10px 20px;
  background-color: #333;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.change-password-btn:hover {
  background-color: #555;
}
</style>
