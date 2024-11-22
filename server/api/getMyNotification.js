import { parseCookies } from 'h3'
export default defineEventHandler(async (event) => {
    const apiUrl = 'http://127.0.0.1:8000/api/notifications/me'
    const cookies = parseCookies(event)
    const token = cookies.authToken
    
    if (!token) {
        return { status: 401, message: "Unauthorized: Token not found" }
    }

    try {
        const response = await $fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        })

        console.log("What data am I holding" + response);

        return response;
    } catch (error) {
        console.error("Error fetching user notifications:", error)
        return { status: 500, message: "Error fetching user notifications" }
    }
})
