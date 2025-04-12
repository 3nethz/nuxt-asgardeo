<template>
  <div class="container">
    <h1>Welcome to the Asgardeo + Nuxt Auth Example</h1>

    <div v-if="isLoading" class="status-section loading">
      <p>Loading session information...</p>
    </div>

    <div
      v-else-if="isAuthenticated && user"
      class="status-section authenticated"
    >
      <h2>You are signed in!</h2>
      <div class="user-info">
        <p><strong>Welcome back!</strong></p>
        <p v-if="user.name">Name: {{ user.name }}</p>
        <p v-if="user.email">Email: {{ user.email }}</p>
        <p v-if="user.sub">User ID (sub): {{ user.sub }}</p>
        <pre v-if="showUserData">
User Data: {{ JSON.stringify(user, null, 2) }}</pre
        >
        <button @click="showUserData = !showUserData" class="toggle-data-btn">
          {{ showUserData ? "Hide Raw Data" : "Show Raw Data" }}
        </button>
      </div>
      <button @click="handleSignOut" class="auth-button signout-button">
        Sign Out
      </button>
    </div>

    <div v-else class="status-section unauthenticated">
      <h2>You are not signed in.</h2>
      <p>Please sign in to continue.</p>
      <NuxtLink to="/login" class="auth-button signin-button-link">
        Go to Sign In Page
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

// Use the enhanced useAuth composable with state variables
const { user, isAuthenticated, isLoading, getUserInfo, signOut, checkAuth } =
  useAuth();

// Local state for UI controls
const showUserData = ref(false);

onMounted(async () => {
  console.log("Index page mounted. Checking authentication status...");
  try {
    // The checkAuth method will update isAuthenticated and user states internally
    await checkAuth();
    console.log(
      "Authentication check completed. Status:",
      isAuthenticated.value ? "authenticated" : "unauthenticated"
    );
  } catch (error) {
    console.error("Error during authentication check:", error);
  }
});

const handleSignOut = async () => {
  console.log("Sign out button clicked. Initiating sign out...");
  try {
    await signOut();
    // The signOut method already updates the state variables
  } catch (error) {
    console.error("Error initiating sign out:", error);
  }
};
</script>

<style scoped>
/* Keep all your existing styles here */
.container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  font-family: sans-serif;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

h2 {
  margin-bottom: 15px;
  color: #444;
}

.status-section {
  margin-top: 20px;
  padding: 20px;
  border-radius: 5px;
  border: 1px solid #ddd;
}

.loading p {
  text-align: center;
  color: #888;
}

.authenticated {
  background-color: #eaf7ea;
  border-color: #c8e6c9;
}

.unauthenticated {
  background-color: #fff3e0;
  border-color: #ffe0b2;
}

.user-info {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}
.user-info p {
  margin: 5px 0;
  color: #555;
}
.user-info strong {
  color: #333;
}
.user-info pre {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f8f8;
  border: 1px dashed #ccc;
  border-radius: 4px;
  font-size: 0.9em;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
}
.toggle-data-btn {
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 0.9em;
  cursor: pointer;
  background-color: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.toggle-data-btn:hover {
  background-color: #ddd;
}

.auth-button,
.auth-button-link {
  display: inline-block;
  padding: 10px 20px;
  margin-top: 15px;
  font-size: 1em;
  color: white;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: background-color 0.2s ease;
}
.auth-button:hover,
.auth-button-link:hover {
  background-color: #0056b3;
}

.signout-button {
  background-color: #dc3545;
}
.signout-button:hover {
  background-color: #c82333;
}

.signin-button-link {
  background-color: #28a745;
}
.signin-button-link:hover {
  background-color: #218838;
}
</style>
