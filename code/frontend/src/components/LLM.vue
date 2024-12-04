<script setup>
import { ref } from 'vue';
import axios from 'axios';

const sentiment = ref(null);
const loading = ref(false);
const error = ref(null);
const text = ref('');
const isChatOpen = ref(false);

async function analyzeSentiment() {
  loading.value = true;
  error.value = null;

  try {
    const response = await axios.post("http://localhost:32000/api/chatbot", {
      message: text.value,
    });
    sentiment.value = response.data[0].generated_text;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Function to toggle chat visibility
const toggleChat = () => {
  isChatOpen.value = !isChatOpen.value;
};
</script>

<template>
  <div>
    <div class="chat-toggle" @click="toggleChat">
      <span>{{ isChatOpen ? 'Close' : 'Open Chat' }}</span>
    </div>

    <div v-if="isChatOpen" class="chatbox">
      <h2>Prompt</h2>
      <textarea v-model="text" placeholder="Enter text to analyze"></textarea>
      <button @click="analyzeSentiment" class="analyze-btn">Analyze</button>
      <p v-if="loading" class="loading-indicator">Analyzing...</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div v-if="sentiment" class="result-container">
        <h3>Result</h3>
        {{ sentiment }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-toggle {
  cursor: pointer;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border-radius: 5px;
  text-align: center;
  width: 150px;
  margin: 10px 0;
}

.chatbox {
  border: 1px solid #007bff;
  border-radius: 5px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  background-color: #1e1e1e;
  color: #f0f0f0;
}

textarea {
  width: 100%;
  height: 80px;
  margin-bottom: 10px;
  background-color: #2b2b2b; 
  color: #f0f0f0;
  border: 1px solid #555;
}

.analyze-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  cursor: pointer;
}

.loading-indicator,
.error {
  margin-top: 10px;
}

.result-container {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #2b2b2b;
  border-radius: 5px;
  background-color: #2b2b2b;
  color: #f0f0f0;
  white-space: pre-wrap;
  max-width: 100%;
}
</style>