<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue';
import { FormField } from '~/components/ui/form';
import FormItem from '~/components/ui/form/FormItem.vue';
import Input from '~/components/ui/input/Input.vue';
import { useAuthStore } from '~/store/auth'

interface LoginResponse {
  status: boolean
  message: string
  data: {
    token: string
    expires_at: string
    is_online: boolean
  }
}

const email = ref('')
const password = ref('')
const router = useRouter()
const authStore = useAuthStore()

const submitForm = async () => {
    const { data, error } = await useFetch<LoginResponse>('/api/login', {
        method: 'POST',
        body: { email: email.value, password: password.value }
    })

    if (error.value) {
        console.error('Login failed:', error.value)
        return;
    }
    
    const token = data.value?.data?.token
    document.cookie = `authToken=${token}; path=/; secure; samesite=strict`
    authStore.setToken(token)
    await router.push('/home')
}
</script>

<template>
  <div class="container">
    <div class="form-card">
      <h2 class="title">Login</h2>
      <form @submit.prevent="submitForm" class="form">
        <FormField name="email">
          <FormItem label="Email Address" class="label">
            <p>Email</p>
            <Input v-model="email" type="email" id="email" class="input" required />
          </FormItem>
        </FormField>

        <FormField name="password">
          <FormItem label="Password" class="label">
            <p>Password</p>
            <Input v-model="password" type="password" id="password" class="input" required />
          </FormItem>
        </FormField>

        <Button type="submit" class="button">Login</Button>
      </form>
    </div>
  </div>
</template>


<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f7f9fc;
}

.form-card {
  width: 100%;
  max-width: 400px;
  background-color: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #555;
}

.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;
}

.input:focus {
  border-color: #4a90e2;
  outline: none;
}

.button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  background-color: #4a90e2;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button:hover {
  background-color: #357ab8;
}
</style>
