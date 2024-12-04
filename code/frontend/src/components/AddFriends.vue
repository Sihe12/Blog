<script setup>
import { useRoute } from 'vue-router';
import axios from 'axios';
import { ref } from 'vue';
import { inject, watch, onMounted } from 'vue';
import { toast } from 'vue3-toastify'

const route = useRoute();
const errorMessage = ref('')
const users = ref([])
const user = inject('user');
const loggedIn = inject('loggedIn');
const searchQuery = ref(route.query.name); 

// Helper function to get the token and config
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

const getUsers = async () => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/getUsers', { searchquery: searchQuery.value }, config);

    if (response.data.success) {
        for (const userObj of response.data.users) {
          const statusResponse = await axios.post('http://localhost:32000/api/getFriendStatus', { FriendID: userObj.UserID }, config);
          userObj.status = statusResponse.data.status;
        }
        users.value = response.data.users.filter(u => u.UserID !== user.value.userId && u.status !== 'blocked');

    } else {
        errorMessage.value = 'Failed to fetch users.';
    }
  } catch (error) {
        errorMessage.value = 'Error fetching users: ' + (error.response?.data?.error || error.message);
        console.error(errorMessage.value);
  }
};


// send friend request
const sendFriendRequest = async (friendId) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/friendRequest', { FriendID: friendId }, config);

    if (response.data.success) {
      toast.success('Friend request sent successfully.');
      await getUsers(); // Refresh the list after sending request
    } else {
      errorMessage.value = 'Failed to send friend request.';
    }
  } catch (error) {
    errorMessage.value = 'Error sending friend request: ' + (error.response?.data?.error || error.message);
    console.error(errorMessage.value);
  }
};

// use onMounted to fetch users when the component is first loaded
onMounted(() => {
    getUsers();
});

watch(() => route.query.name, (newQuery) => {
    searchQuery.value = newQuery || ''; // default to an empty string if no query is provided
    getUsers(); // fetch users whenever the searchQuery changes
});


</script>

<template>
    <div>
        <h1>Search Results for "{{ searchQuery }}"</h1>
    </div>
    <div v-if="users.length">
    <table>
        <thead>
            <tr>
                <th>Username</th>
                <th>Add friend</th>
            </tr>
        </thead>
      <tbody>
        <tr v-for="user in users" :key="user.UserID">
            <td>{{ user.Username }}</td>
            <td class="table-btn">
                <button v-if="user.status !== 'pending' && user.status !== 'friend'" @click="sendFriendRequest(user.UserID)">Add Friend</button>
                <span v-if="user.status === 'pending'">Pending</span>
                <span v-if="user.status === 'friend'">Friends</span>
            </td>
        </tr>
      </tbody>
    </table>
    </div>
</template>

<style scoped>
    table {
        width: 70%;
        border-collapse: collapse;
        margin-top: 20px;
        margin: auto;
    }
    .table-btn {
        text-align: center;
    }
</style>
  

  