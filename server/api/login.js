// server/api/login.js
export default defineEventHandler(async (event) => {
    // Replace this with your actual API URL
    const apiUrl = 'http://127.0.0.1:8000/api/user/login'

    // You can also get data from the request body if needed
    const body = await readBody(event)

    // Fetch data from the external API
    const response = await $fetch(apiUrl, {
        method: 'POST',
        body: body, // send the login credentials
        headers: {
            'Content-Type': 'application/json',
        },
    })

    return response
})
