// store/auth.js
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        isLoggedIn: null,
        token: useCookie('authToken').value,
        name: '',
        id: null,
        userId: null
    }),
    actions: {
        setToken(token) {
            this.token = token
            this.isLoggedIn = true
            useCookie('authToken').value = token
        },
        getToken() {
            return this.token
        },
        logout() {
            this.isLoggedIn = false
            useCookie('authToken').value = null
        },
        setUserId(userId) {
            this.userId = userId
        },
        getUserId() {
            return this.userId
        },
        setUser(name) {
            this.name = name
        },
        getRoom(){
            return this.id
        },
        setRoomId(id){
            this.id = Math.abs(parseInt(id, 10));
        },
        getUser() {
            return this.name
        }
    }
})
