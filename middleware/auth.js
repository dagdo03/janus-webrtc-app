// middleware/auth.js
import { useCookie } from '#app'

export default defineNuxtRouteMiddleware((to, from) => {
    const app = useNuxtApp();
    const token = useCookie('authToken') // Access the cookie directly

    if (token.value == null) {
        return navigateTo('/')
    }
})