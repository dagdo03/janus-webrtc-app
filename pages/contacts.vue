<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/store/auth'
definePageMeta({
  middleware: 'auth'
})
// Updated interface to match the API response
interface User {
  id: number
  name: string
  email: string
  role: string
  email_verified_at: string | null
  updated_at: string
  created_at: string
  is_online: number
}

const userId = ref<number | null>(null);
const router = useRouter()
const authStore = useAuthStore()
const users = ref<User[] | null>(null);
const userInvited = ref(null);
const user = ref(null);

const getAllUsers = async () => {
  try{
    const response: any = await $fetch('/api/getAllUsers');
    users.value = response.data
  }catch(error){
    console.error("Error fetching data ", error)
  }
}

const callUser = (userEmail: string) => {
  console.log(`Calling user : ${userEmail}`)
  // Add the functionality for the call action here
  router.push({ path: `/newRoomInvite`, query: { userEmail } });
}
const fetchUserData = async () => {
  try{
  const data: any = await $fetch('/api/getUserData');
  user.value = data.data; 
  authStore.setUser(data.data.name);
  authStore.setUserId(data.data.id);
  console.log(authStore.getUser());
  console.log(user.value) // Log to verify the user ref is updated
  }catch(error){
    console.error("Error fetching data ", error)
  }
};
const logout = async () => {
  try{
    const data = await $fetch('/api/logout');
    authStore.setUser(null);

    router.push('/')
  }catch(error){
    console.error("Error fetching data ", error);
  }
}

onMounted(() => {
  getAllUsers();
  fetchUserData();
});
</script>

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
      <a href="/notifications" class="sidebar-link">
        <i class="fas fa-bell"></i> Notification
      </a>
    </li>
    <li class="sidebar-item">
      <a href="/contacts" class="sidebar-link">
        <i class="fas fa-user"></i> Contacts
      </a>
    </li>
  </ul>

  <!-- Sidebar Footer with Logout Button -->
  <div class="sidebar-footer">
    <button @click="logout()" class="sidebar-logout-button">
      <i class="fas fa-sign-out-alt"></i> Logout
    </button>
  </div>
</aside>
  </div>
  <h1  class="title">User List</h1>
  <div  class="container">
      <div v-for="user in users" :key="user.id" class="user-card">
        <div v-if="user.id != authStore.getUserId() " class="user-info" >
          <div :class="['status-indicator', { online: user.is_online }]"></div>
          <div class="details">
            <h3 class="name">{{ user.name }}</h3>
            <p class="email">{{ user.email }}</p>
            <p class="role">{{ user.role }}</p>
          </div>
        </div>
        <button v-if="user.is_online && user.id != authStore.getUserId()" @click="callUser(user.email)" class="call-button">Call</button>
      </div>
    </div>
</template>

<style scoped>
.layout {
  display: flex; /* Use flexbox for layout */
}

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
  margin-left: 210px; /* Shift content to the right to accommodate sidebar */
  max-width: 100%;
  padding: 20px;
}

.title {
  font-size: 1.8em;
  margin-bottom: 20px;
  text-align: center;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
  background-color: #ffffff;
}

.user-info {
  display: flex;
  align-items: center;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #e0e0e0;
  margin-right: 12px;
}

.status-indicator.online {
  background-color: green;
}

.details {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 1.2em;
  margin: 0;
}

.email, .role {
  font-size: 0.9em;
  color: #555;
  margin: 2px 0;
}

.call-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.call-button:hover {
  background-color: #45a049;
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
/* Add styles for icon hover effects */
.sidebar-link:hover {
  color: #007bff; /* Optional: Change color on hover */
}
.sidebar-footer {
  margin-top: auto;
  padding: 1rem;
  text-align: center;
  border-top: 1px solid #ccc; /* Optional: separates the footer visually */
}

.sidebar-logout-button {
  background: none;
  border: none;
  color: #333;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-logout-button:hover {
  color: #d9534f; /* Optional: hover effect for logout button */
}
</style>
