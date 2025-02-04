let loggedInUserId = null; // ✅ Store current user ID globally

document.addEventListener("DOMContentLoaded", async () => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/chathub")
        .withAutomaticReconnect()
        .build();

    // ✅ Fetch the Current User ID Once
    try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
            const data = await response.json();
            loggedInUserId = data.userId; // ✅ Store globally
        } else {
            console.error("Failed to fetch current user.");
        }
    } catch (error) {
        console.error("Error fetching current user:", error);
    }

    // ✅ Start SignalR Connection
    connection.start()
        .then(() => console.log("SignalR connection established."))
        .catch(err => console.error("SignalR connection error:", err));

    // ✅ Load Recent Chats on Page Load
    loadRecentChats();

    // ✅ Attach Search Event Listener
    const searchInput = document.getElementById("searchUser");
    if (searchInput) {
        searchInput.addEventListener("input", async function () {
            await searchUsers(this.value.trim());
        });
    } else {
        console.error("Search input not found in DOM.");
    }

    // ✅ Listen for Incoming Messages
    connection.on("ReceiveMessage", async (senderId, message, timestamp, senderEmail) => {
        const activeUserElement = document.getElementById("activeUserName");

        if (senderId === activeUserElement.dataset.userId) {
            appendMessage(senderEmail.normalizedUserName, message, timestamp, senderId);
        } else {
            const userConfirmed = confirm(`New message from ${senderEmail.normalizedUserName}: ${message}\nClick OK to open chat.`);
            if (userConfirmed) {
                await setupChat(senderId, senderEmail.normalizedUserName);
                appendMessage(senderEmail.normalizedUserName, message, timestamp, senderId);
            } else {
                updateUnreadCount(senderId);
            }
        }
    });

    // ✅ Send Message on Enter Key
    document.getElementById("messageInput").addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            document.getElementById("sendMessage").click();
        }
    });

    // ✅ Send Message Function
    document.getElementById("sendMessage").addEventListener("click", async () => {
        const activeUserElement = document.getElementById("activeUserName");
        const recipientId = activeUserElement?.dataset.userId;
        const message = document.getElementById("messageInput")?.value;
        const chatMessages = document.getElementById("chatMessages");

        if (!recipientId || !message.trim()) {
            alert("Select a user and type a message before sending.");
            return;
        }

        try {
            console.log("Attempting to send message via SignalR...");

            // ✅ Append message to sender's UI immediately
            appendMessage("You", message, new Date().toISOString(), loggedInUserId);

            await connection.invoke("SendMessage", recipientId, message);
            console.log("Message sent via SignalR.");

            // ✅ Clear input after sending
            document.getElementById("messageInput").value = "";

        } catch (err) {
            console.error("Error sending message via SignalR:", err);
        }
    });

    // ✅ Load Recent Chats
    async function loadRecentChats() {
        const chatList = document.getElementById("chatList");
        chatList.innerHTML = "";

        try {
            const response = await fetch(`/api/Message/recent-chats`);
            const recentChats = await response.json();

            for (let chat of recentChats) {
                const userEmail = await getUserEmail(chat.chatPartnerId);

                const chatItem = document.createElement("a");
                chatItem.classList.add("list-group-item", "list-group-item-action", "d-flex", "align-items-center");
                chatItem.dataset.userId = chat.ChatPartnerId;
                chatItem.innerHTML = `
                    <img src="/lib/Sound/profile.png" class="rounded-circle me-2">
                    <span>${userEmail || "Unknown User"}</span>
                `;
                chatItem.onclick = () => setupChat(chat.chatPartnerId, userEmail);
                chatList.appendChild(chatItem);
            }
        } catch (err) {
            console.error("Error loading recent chats:", err);
        }
    }

    // ✅ Fetch User Email
    async function getUserEmail(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) throw new Error("User not found");
            const user = await response.json();
            return user.userName;
        } catch (err) {
            console.error(`Error fetching email for user ${userId}:`, err);
            return "Unknown User";
        }
    }

    // ✅ Setup Chat
    async function setupChat(userId, userEmail) {
        const chatMessages = document.getElementById("chatMessages");
        const activeUserNameElement = document.getElementById("activeUserName");

        activeUserNameElement.textContent = userEmail;
        activeUserNameElement.dataset.userId = userId;
        chatMessages.innerHTML = ""; // Clear previous chat messages

        try {
            const response = await fetch(`/api/Message/messages/${userId}`);
            const messages = await response.json();

            messages.forEach(msg => {
                appendMessage(
                    msg.senderId === loggedInUserId ? "You" : userEmail,
                    msg.message,
                    msg.sentAt,
                    msg.senderId
                );
            });

        } catch (err) {
            console.error("Error fetching chat history:", err);
        }
    }

    // ✅ Append Messages Correctly
    function appendMessage(senderDisplay, message, timestamp, senderId) {
        const chatMessages = document.getElementById("chatMessages");

        // ✅ Reverse alignment so that messages appear correctly for each user
        const isMyMessage = senderId === loggedInUserId;
        const alignment = isMyMessage ? "text-end" : "text-start";
        const bgClass = isMyMessage ? "bg-primary text-white" : "bg-secondary text-dark";

        const messageHtml = `
            <div class="d-flex ${isMyMessage ? "justify-content-end" : "justify-content-start"} mb-3">
                <div class="p-2 rounded ${bgClass}" style="max-width: 60%;">
                    <strong>${isMyMessage ? "You" : senderDisplay}:</strong>
                    <p class="m-0">${message}</p>
                    <small class="d-block text-muted">${new Date(timestamp).toLocaleTimeString()}</small>
                </div>
            </div>
        `;

        chatMessages.innerHTML += messageHtml;
        chatMessages.scrollTop = chatMessages.scrollHeight; // ✅ Auto-scroll to latest message
    }

    // ✅ Update Unread Messages
    function updateUnreadCount(userId) {
        const chatList = document.getElementById("chatList").children;
        for (let chat of chatList) {
            if (chat.dataset.userId === userId) {
                let badge = chat.querySelector(".badge");
                if (!badge) {
                    badge = document.createElement("span");
                    badge.classList.add("badge", "bg-danger", "rounded-pill", "ms-2");
                    badge.textContent = "1";
                    chat.appendChild(badge);
                } else {
                    badge.textContent = parseInt(badge.textContent) + 1;
                }
            }
        }
    }

    // ✅ Handle Connection Loss
    connection.onclose(err => {
        alert("Connection lost. Trying to reconnect...");
        setTimeout(() => connection.start().catch(err => console.error(err.toString())), 5000);
    });

});
