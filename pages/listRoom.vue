<template>
  <div class="min-h-screen flex items-center justify-center bg-white">
    <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
      <h2 class="text-2xl font-semibold text-center text-gray-700 mb-6">Login</h2>
      <form @submit.prevent="submitForm">
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input 
            v-model="email" 
            type="email" 
            id="email" 
            class="mt-1 text-black block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input 
            v-model="password" 
            type="password" 
            id="password" 
            class="mt-1 block bg-white text-black w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          />
        </div>
        <button 
          type="submit" 
          class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-500 transition duration-300">
          Login
        </button>
      </form>
    </div>
  </div>
</template>


<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/store/auth' 

const email = ref('')
const password = ref('')
const router = useRouter()
const authStore = useAuthStore()

const submitForm = async () => {
    const { data, error } = await useFetch('/api/login', {
        method: 'POST',
        body: { email: email.value, password: password.value }
    })

    if (error.value) {
        console.error('Login failed:', error.value)
    }
    authStore.login()
    await router.push('/join')
}

</script>

<style scoped>
/* Custom styles (optional) */
</style>
