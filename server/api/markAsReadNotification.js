import { parseCookies } from 'h3'

export default defineEventHandler(async (event) => {
    const cookies = parseCookies(event)
    const token = cookies.authToken
    
    if (!token) {
        return { status: 401, message: "Unauthorized: Token not found" }
    }

    const notificationId = event.context.params?.notificationId;

    if (!notificationId) {
        return { status: 400, message: "Bad Request: Notification ID is required" }
    }

    const apiUrl = `http://127.0.0.1:8000/api/notifications/${notificationId}/read`;

    try {
        const response = await $fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        })

        console.log("Fetched notification data:", response);

        return response;
    } catch (error) {
        console.error("Error marking notification as read:", error)
        return { status: 500, message: "Error marking notification as read" }
    }
})
