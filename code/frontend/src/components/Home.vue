<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { inject } from 'vue';
import { useRouter } from 'vue-router';

import { toast } from 'vue3-toastify'

const router = useRouter();
const user = inject('user');
const profilePic = inject('profilePic');
const loggedIn = inject('loggedIn');

const title = ref('');
const content = ref('');
const posts = ref([]);
const friendsPosts = ref([]);
const errorMessage = ref('');
const newComments = ref({});

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

// get posts for the logged-in user
const getPosts = async () => {
  try {
    const config = getTokenConfig();
    if (!config) return; // stop if no token is found

    const response = await axios.post('http://localhost:32000/api/getPosts', {
      UserID: user.value.userId,  // pass the UserID in the body
    }, config);

    if (response.data.success) {
      posts.value = await Promise.all(response.data.posts.map(async post => ({
        ...post,
        comments: [], // initialize comments for each post
        newComment: '', // initialize separate comment field for each post
        likeCount: await getLikeCount(post.id),
        liked: await checkLiked(post.id)
      })));

      // initialize newComments object for each post
      posts.value.forEach(post => {
        if (!newComments.value[post.id]) {
          newComments.value[post.id] = '';
        }
      });
    } else {
      errorMessage.value = 'Failed to fetch posts.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error fetching posts: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};

// create a new post
const createPost = async () => {
  if (!title.value || !content.value) {
    errorMessage.value = 'Title and content cannot be empty.';
    return;
  }

  try {
    const config = getTokenConfig();
    if (!config) return; 

    const response = await axios.post('http://localhost:32000/api/createPosts', {
      UserID: user.value.userId,  
      title: title.value,          
      content: content.value,      
    }, config);

    if (response.data.success) {
      title.value = '';   
      content.value = ''; 
      toast.success('Post created successfully!');
      await getPosts(); 
    } else {
      errorMessage.value = 'Failed to create a new post.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error creating post: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};

// Get comments for a specific post
const getComments = async (postId) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.get(`http://localhost:32000/api/getComments/${postId}`, config);
    if (response.data.success) {
      const userPost = posts.value.find(p => p.id === postId);
      const friendPost = friendsPosts.value.find(p => p.id === postId);
      
      if (userPost) {
        userPost.comments = response.data.comments;
      } else if (friendPost) {
        friendPost.comments = response.data.comments;
      }
    } else {
      errorMessage.value = 'Failed to fetch comments.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error fetching comments: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};

// Add a comment to a post
const addComment = async (postId) => {
  if (!user.value || !user.value.userId) {
    errorMessage.value = 'User is not authenticated or userId is missing.';
    toast.error(errorMessage.value);
    return;
  }

  if (!newComments.value[postId]) {
    errorMessage.value = 'Comment cannot be empty.';
    toast.error(errorMessage.value);
    return;
  }

  try {
    const config = getTokenConfig();
    if (!config) return; 

    const response = await axios.post('http://localhost:32000/api/addComment', {
      PostID: postId,
      UserID: user.value.userId,  
      content: newComments.value[postId],  
    }, config);

    if (response.data.success) {
      newComments.value[postId] = '';
      await getComments(postId);
    } else {
      toast.error('Failed to add comment.');
    }
  } catch (error) {
    errorMessage.value = 'Error adding comment: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};


// Delete a comment
const deleteComment = async (commentId, postId) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.delete(`http://localhost:32000/api/deleteComment/${commentId}`, config);
    if (response.data.success) {
      await getComments(postId); 
    } else {
      errorMessage.value = 'Failed to delete comment.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error deleting comment: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};

// Get friends' posts
const getFriendsPosts = async () => {
  console.log("Getting friends' posts");
  console.log(user.value.userId);
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/getFriendsPosts', {
      UserID: user.value.userId,
    }, config);

    if (response.data.success) {
      friendsPosts.value = await Promise.all(response.data.posts.map(async (post) => {
        const username = await getUsername(post.UserID);
        return {
          ...post,
          Username: username,
          comments: [],  
          likeCount: await getLikeCount(post.id),
          liked: await checkLiked(post.id),
        };
      }));


      friendsPosts.value.forEach(post => {
        if (!newComments.value[post.id]) {
          newComments.value[post.id] = '';
        }
      });

      for (const post of friendsPosts.value) {
        await getComments(post.id);
      }
    } else {
      errorMessage.value = 'Failed to fetch posts.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error fetching posts: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
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
    toast.error(errorMessage.value);
  }
};

// Check if user has friends before trying to fetch friends' posts
const checkFriends = async () => {
  console.log("Checking friends");
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/checkFriends', {
      UserID: user.value.userId,  
    }, config);

    if (response.data.success && response.data.friends.length > 0) {
      getFriendsPosts();
    } else if (response.data.success && response.data.friends.length === 0) {
      console.log("No friends found");
    } else {
      errorMessage.value = 'Failed to fetch posts.';
      toast.error(errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = 'Error fetching posts: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
}

const likePost = async (postId) => {
  try {
    const config = getTokenConfig();
    if (!config) return;

    const response = await axios.post('http://localhost:32000/api/likePost', {
      PostID: postId,
      UserID: user.value.userId,
    }, config);

    if (response.data.success) {
      // update the like status and count locally
      const post = posts.value.find(p => p.id === postId) || friendsPosts.value.find(p => p.id === postId);
      if (post) {
        post.liked = !post.liked;
        post.likeCount += post.liked ? 1 : -1;
      }
    }
  } catch (error) {
    errorMessage.value = 'Error liking/unliking post: ' + (error.response?.data?.error || error.message);
    toast.error(errorMessage.value);
  }
};

const getLikeCount = async (postId) => {
  try {
    const response = await axios.get(`http://localhost:32000/api/getLikeCount/${postId}`);
    if (response.data.success) {
      return response.data.likeCount;
    }
  } catch (error) {
    return 0;
  }
};

const checkLiked = async (postId) => {
  try {
    const config = getTokenConfig();
    if (!config) return false;

    const response = await axios.post('http://localhost:32000/api/checkLiked', {
      PostID: postId,
      UserID: user.value.userId,
    }, config);

    return response.data.success && response.data.liked;
  } catch (error) {
    return false;
  }
};

// Method to format the date from ISO 8601 to a readable format
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};

const toggleComments = (postId) => {
  const post = posts.value.find(p => p.id === postId) || friendsPosts.value.find(p => p.id === postId);
  if (post) {
    post.showComments = !post.showComments;
    if (post.showComments && post.comments.length === 0) {
      getComments(postId);
    }
  }
};

getPosts();
checkFriends();

const location = ref('');
const weather_img = ref("");
const temperature = ref("");
const location_name = ref("");

onMounted(async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, showError);    
  } else {
    location.value = "Geolocation is not supported by this browser.";
  }
});

async function showPosition(position) {
  location.value = `${position.coords.latitude},${position.coords.longitude}`;

  const response = await axios.post('http://localhost:32000/api/weather', {
      location: location.value,
  });
  const data = response.data;
  weather_img.value = data.current.condition.icon;
  temperature.value = data.current.temp_c;
  location_name.value = data.location.name;
}

function showError(error) {
    location.value = null
}

const shareWeather = () => {
  title.value = `Weather in ${location_name.value}`;
  content.value = `It's currently ${temperature.value}°C in ${location_name.value}!`;
};
</script>

<template>
  <div class="container mt-4">
    <h1 class="mb-4">Welcome, {{ user.firstname }}!</h1>
    <div v-if="location != null" class="weather">
      <img :src="weather_img" alt="Weather Icon" />
      <span>{{ temperature }}°C </span>
      <span>{{ location_name }}</span>
      <br />
      <button @click="shareWeather" class="btn btn-primary">
        <i class="fas fa-share"></i> Share
      </button>
    </div>

    <!-- Blog post form -->
    <div class="card mb-4">
      <div class="card-body">
        <h2 class="card-title">Create a new post</h2>
        <input v-model="title" placeholder="Title" class="form-control mb-2" />
        <textarea v-model="content" placeholder="What's on your mind?" class="form-control mb-2" rows="3"></textarea>
        <button @click="createPost" class="btn btn-primary">Post</button>
      </div>
    </div>
  </div>

  <div class="posts">
    <!-- List of posts -->
    <div class="left-column">
        <h2 class="mb-1">Your Posts</h2>
        <div v-for="post in posts" :key="post.id" class="card mb-3">
          <div class="card-body">
            <h3 class="card-title">{{ post.title }}</h3>
            <p class="card-text">{{ post.content }}</p>
            <div class="d-flex justify-content-between align-items-center">
              <small>{{ formatDate(post.created_at) }}</small>
              <div class="btn-group">
                <button @click="likePost(post.id)" class="btn btn-sm" :class="{ 'btn-primary': post.liked, 'btn-outline-primary': !post.liked }">
                  <i class="fas fa-thumbs-up"></i> {{ post.likeCount }}
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="toggleComments(post.id)">
                  <i class="fas fa-comment"></i> Comments
                </button>
              </div>
            </div>
          </div>

          <!-- Comments Section -->
          <div v-if="post.showComments" class="card-footer">
            <h6>Comments</h6>
            <div v-for="comment in post.comments" :key="comment.id" class="mb-2">
              <div class="d-flex justify-content-between align-items-center">
                {{ comment.content }}
                <button v-if="comment.UserID === user.userId" @click="deleteComment(comment.id, post.id)" class="btn btn-danger btn-sm">Delete</button>
              </div>
              <div style="font-size: xx-small;">{{ formatDate(comment.created_at) }}</div>
            </div>
            <!-- Add Comment -->
            <div class="mt-2">
              <div class="input-group">
                <input v-model="newComments[post.id]" class="form-control" placeholder="Add a comment..." />
                <div class="input-group-append">
                  <button @click="addComment(post.id)" class="btn btn-outline-secondary">Comment</button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

      <!-- Friends' Posts -->
      <div class="right-column">
        <h2 class="mb-3">Friends' Posts</h2>
        <div v-for="post in friendsPosts" :key="post.id" class="card mb-3">
          <div class="card-body">
            <h5 class="card-title">{{ post.Username }}</h5>
            <h6 class="card-subtitle mb-2">{{ post.title }}</h6>
            <p class="card-text">{{ post.content }}</p>
            <div class="d-flex justify-content-between align-items-center">
              <small>{{ formatDate(post.created_at) }}</small>
              <div class="btn-group">
                <button @click="likePost(post.id)" class="btn btn-sm" :class="{ 'btn-primary': post.liked, 'btn-outline-primary': !post.liked }">
                  <i class="fas fa-thumbs-up"></i> {{ post.likeCount }}
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="toggleComments(post.id)">
                  <i class="fas fa-comment"></i> Comments
                </button>
              </div>
            </div>
          </div>

          <!-- Comments for Friends' Posts -->
          <div v-if="post.showComments" class="card-footer">
            <h6>Comments</h6>
            <div v-for="comment in post.comments" :key="comment.id" class="mb-2">
              <div class="d-flex justify-content-between align-items-center">
                {{ comment.content }}
                <button v-if="comment.UserID === user.userId" @click="deleteComment(comment.id, post.id)" class="btn btn-danger btn-sm">Delete</button>
              </div>
              <div style="font-size: xx-small;">{{ formatDate(comment.created_at) }}</div>
            </div>
            <!-- Add Comment to Friend's Post -->
            <div class="mt-2">
              <div class="input-group">
                <input v-model="newComments[post.id]" class="form-control" placeholder="Add a comment..." />
                <div class="input-group-append">
                  <button @click="addComment(post.id)" class="btn btn-outline-secondary">Comment</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<style scoped>
.posts {
  width: 100%;
  display: flex;
  justify-content: space-between;
  justify-content: center;

}
.left-column, .right-column {
    flex: 1; 
    padding: 20px; 
}
.form-control {
  background-color: #333;
  color: rgba(255, 255, 255, 0.87);
  border: 1px solid #11132e;
}

.form-control::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.text-muted) {
  color: rgba(255, 255, 255, 0.87);
}

.card-title {
  color: #fff;
}

.card .card-title {
  color: #fff !important;
}

.form-control:focus {
  background-color: #444;
  color: rgba(255, 255, 255, 0.87);
  border-color: #11132e;
  box-shadow: none;
}

.card {
  background-color: #1a1a1a;
  color: rgba(255, 255, 255, 0.87);
  border: 1px solid #11132e;
}

.card-body {
  background-color: #1a1a1a;
  color: rgba(255, 255, 255, 0.87);
}

.card-footer {
  background-color: #2a2a2a;
}

.btn-outline-secondary {
  border-color: #646cff;
  color: rgba(255, 255, 255, 0.87);
}

.btn-outline-secondary:hover {
  background-color: #535bf2;
  color: #fff;
}

.btn-primary {
  background-color: #646cff;
  border-color: #646cff;
}

.btn-primary:hover {
  background-color: #535bf2;
  border-color: #535bf2;
}

.showcase {
  margin: auto;
  width: 70%;
}

.post {
  margin-bottom: 20px;
}

.error {
  color: red;
  margin-bottom: 10px;
}

.profile-pic {
  height: 7.2em;
  padding: 1.8em;
  will-change: filter;
  transition: filter 300ms;
}

.friendsPostsFrame {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}

.friendsPostsFrame p {
  text-align: left;
  margin: 5px;
  margin-bottom: 1em;
}

.friendsPostsFrame h3 {
  border-bottom: 1px solid #868686;
}

.unamePost {
  margin-bottom: 2px;
  text-align: left;
}

.card-footer {
  margin-top: 10px;
}

.post-actions {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.post-actions button {
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #888;
  transition: color 0.3s ease;
}

.post-actions button.liked {
  color: #1DA1F2;
}

.post-actions button:hover {
  color: #1DA1F2;
}

.post-actions button svg {
  margin-right: 5px;
}

</style>


