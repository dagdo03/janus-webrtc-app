import { parseCookies } from 'h3'
export default defineEventHandler(async (event) => {
    // Replace this with your actual API URL
    const apiUrl = 'http://127.0.0.1:8000/api/user/logout'
    // Retrieve token from cookies
    const cookies = parseCookies(event)
    const token = cookies.authToken
    // Fetch data from the external API
    const response = await $fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    })
    return response
})