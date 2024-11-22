import { parseCookies } from 'h3'
export default defineEventHandler(async (event) => {
    // Replace this with your actual API URL
    console.log("I think its working ?");
    const apiUrl = 'http://127.0.0.1:8000/api/user/invite'

    // Retrieve token from cookies
    const cookies = parseCookies(event)
    const token = cookies.authToken

    if (!token) {
        return { status: 401, message: "Unauthorized: Token not found" }
    }
    // You can also get data from the request body if needed
    const body = await readBody(event)
    console.log("bang bang sidomuncul" + body);

    // Fetch data from the external API
    const response = await $fetch(apiUrl, {
        method: 'POST',
        body: body, // send the login credentials
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    })

    return response
})
