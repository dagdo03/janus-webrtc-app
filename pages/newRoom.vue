<template>
  <!-- Include Font Awesome in your index.html or main layout file -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="sidebar-title">Menu</h2>
      <ul class="sidebar-menu">
        <li class="sidebar-item">
          <a href="/home" class="sidebar-link">
            <i class="fas fa-home"></i> Home
          </a>
        </li>
        <li class="sidebar-item">
          <a href="/contacts" class="sidebar-link">
            <i class="fas fa-bell"></i> Notification
          </a>
        </li>
        <li class="sidebar-item">
          <a href="/contacts" class="sidebar-link">
            <i class="fas fa-user"></i> Contacts
          </a>
        </li>
        <li class="sidebar-item">
          <a href="#link3" class="sidebar-link">
            <i class="fas fa-user"></i> Profile
          </a>
        </li>
      </ul>
    </aside>
  </div>
  <div class="container">
    <div class="form-card">
      <h2 class="title">Create New Room</h2>
      <form @submit.prevent="submitForm" class="form">
        <FormField name="room">
          <FormItem label="Room Name" class="label">
            <p>Room Name</p>
            <Input v-model="roomName" type="text" id="room" class="input" required />
          </FormItem>
        </FormField>

        <FormField name="password">
          <FormItem label="Password" class="label">
            <p>Password (Optional)</p>
            <Input v-model="password" type="password" id="password" class="input" required />
          </FormItem>
        </FormField>

        <Button type="submit" class="button">Login</Button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '~/components/ui/button/Button.vue';
import { FormField } from '~/components/ui/form';
import FormItem from '~/components/ui/form/FormItem.vue';
import Input from '~/components/ui/input/Input.vue';
import { useAuthStore } from '~/store/auth' 

const roomName = ref('')
const password = ref('')
const router = useRouter()
const authStore = useAuthStore()

const submitForm = async () => {
    const { data, error } = await useFetch('/api/createRoom', {
        method: 'POST',
        body: { room_name: roomName.value, password: password.value }
    })

    if (error.value) {
        console.error('Login failed:', error.value)
        return;
    }
    await router.push('/home')
}
</script>

<style scoped>
.sidebar {
  width: 200px; /* Adjust width as needed */
  position: fixed; /* Keep sidebar fixed */
  left: 0; /* Align to left */
  top: 0; /* Align to top */
  height: 100%; /* Full height */
  background-color: #f8f9fa; /* Light background */
  padding: 1rem; /* Padding */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1); /* Shadow for depth */
}
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
/* Sidebar Styles */
.sidebar-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.sidebar-menu {
  list-style-type: none;
  padding: 0;
}

.sidebar-item {
  margin: 0.5rem 0;
}

.sidebar-item a {
  text-decoration: none;
  color: #000000; /* Link color */
}

.sidebar-item a:hover {
  text-decoration: underline; /* Underline on hover */
}

/* Add styles for icon hover effects */
.sidebar-link {
  text-decoration: none;
  color: black; /* Black text color */
  display: flex;
  align-items: center; /* Center items vertically */
}

.sidebar-link i {
  margin-right: 8px; /* Space between icon and text */
}

/* Optional: Change color on hover */
.sidebar-link:hover {
  color: #007bff;
}
  
</style>