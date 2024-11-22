import { parseCookies } from 'h3'
export default defineEventHandler(async (event) => {
    // Replace this with your actual API URL
    const apiUrl = 'http://127.0.0.1:8000/api/janus/create-room'

    // Retrieve token from cookies
    const cookies = parseCookies(event)
    const token = cookies.authToken
    // You can also get data from the request body if needed
    const body = await readBody(event)

    // Fetch data from the external API
    const response = await $fetch(apiUrl, {
        method: 'POST',
        body: body,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    })

    return response
})
