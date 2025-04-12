<template>
  <div class="login-container">
    <h1>Sign In</h1>
    <p>Click the button below to sign in with Asgardeo.</p>

    <button @click="handleSignIn" :disabled="isLoading" class="signin-button">
      {{ isLoading ? 'Redirecting...' : 'Sign In with Asgardeo' }}
    </button>

    <p v-if="error" class="error-message">
      An error occurred: {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 1. Get the signIn function from our composable
const { signIn } = useAuth();

// 2. Add state for loading indicator and potential errors
const isLoading = ref(false);
const error = ref<string | null>(null);

// 3. Define the handler function for the button click
const handleSignIn = async () => {
  isLoading.value = true; // Set loading state
  error.value = null;     // Clear previous errors

  try {
    // Call the signIn function from the composable
    await signIn();
    // If signIn involves a redirect (as it does), the code below
    // might not execute if the browser navigates away quickly.
    // isLoading is primarily for the brief moment before navigation.
  } catch (err: any) {
    console.error("Sign-in initiation failed:", err);
    error.value = err.message || 'Failed to start the sign-in process.';
    isLoading.value = false; // Reset loading state on error
  }
  // Don't reset isLoading here on success, as navigation should happen
};
</script>

<style scoped>
/* Keep all your existing styles here */
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
  font-family: sans-serif;
}

h1 {
  margin-bottom: 20px;
  color: #333;
}

p {
  margin-bottom: 25px;
  color: #555;
}

.signin-button {
  padding: 12px 25px;
  font-size: 16px;
  color: white;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.signin-button:hover {
  background-color: #0056b3;
}

.signin-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 20px;
  color: #dc3545;
  font-weight: bold;
}
</style>