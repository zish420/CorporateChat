document.addEventListener("DOMContentLoaded", () => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/chathub")
        .withAutomaticReconnect()
        .build();

    // ✅ Load Recent Chats when the page loads
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

    // ✅ Start SignalR Connection
    connection.start()
        .then(() => console.log("SignalR connection established."))
        .catch(err => console.error("SignalR connection error:", err));

    // ✅ Function to Load Recent Chats
    async function loadRecentChats() {
        const chatList = document.getElementById("chatList");
        chatList.innerHTML = "";

        try {
            const response = await fetch(`/api/Message/recent-chats`);
            const recentChats = await response.json();

            for (let chat of recentChats) {
                const userEmail = await getUserEmail(chat.chatPartnerId); // Fetch email

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


    async function getUserEmail(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) throw new Error("User not found");
            const user = await response.json();
            return user.userName; // Adjust field name if different
        } catch (err) {
            console.error(`Error fetching email for user ${userId}:`, err);
            return "Unknown User";
        }
    }


    // ✅ Function to Search Users Dynamically
    async function searchUsers(query) {
        const userList = document.getElementById("userList");
        userList.innerHTML = ""; // Clear current list

        if (query.length < 2) {
            userList.innerHTML = `<li class="list-group-item">Please enter at least 2 characters</li>`;
            return;
        }

        try {
            const response = await fetch(`/api/users/search?query=${query}`);
            const users = await response.json();

            if (users.length === 0) {
                userList.innerHTML = `<li class="list-group-item">No users found</li>`;
                return;
            }

            users.forEach(user => {
                const li = document.createElement("li");
                li.classList.add("list-group-item", "d-flex", "align-items-center");
                li.innerHTML = `
                    <img src="/lib/Sound/profile.png" alt="Profile Pic" class="rounded-circle me-2">
                    <span>${user.userName}</span>
                `;
                li.onclick = () => {
                    setupChat(user.id, user.userName);
                };
                userList.appendChild(li);
            });
        } catch (err) {
            console.error("Error fetching users:", err);
            userList.innerHTML = `<li class="list-group-item text-danger">Error fetching results</li>`;
        }
    }

    // ✅ Listen for incoming messages
    connection.on("ReceiveMessage", (senderId, message, timestamp, senderEmail) => {
        const activeUserElement = document.getElementById("activeUserName");

        if (senderId !== activeUserElement.dataset.userId) {
            const userConfirmed = confirm(`New message from ${senderEmail.normalizedUserName}: ${message}\nClick OK to open chat.`);
            if (userConfirmed) {
                setupChat(senderId, senderEmail.normalizedUserName);
            } else {
                updateUnreadCount(senderId);
            }
        } else {

            appendMessage(senderEmail.normalizedUserName, message, timestamp, senderId, currentUserId);
        }
    });


    document.getElementById("messageInput").addEventListener("keypress", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            document.getElementById("sendMessage").click();
        }
    });

    function setupChat(userId, userEmail) {
        document.getElementById("activeUserName").textContent = userEmail;
    }
    // ✅ Function to update unread messages
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


    // ✅ Function to Append Messages Properly
    function appendMessage(senderDisplay, message, timestamp, senderId, loggedInUserId) {
        const chatMessages = document.getElementById("chatMessages");

        const isMyMessage = senderId === loggedInUserId; // ✅ Check if it's the current user's message
        const alignment = isMyMessage ? "text-end" : "text-start";
        const bgClass = isMyMessage ? "bg-primary text-white" : "bg-secondary text-dark";

        const messageHtml = `
        <div class="${alignment} mb-3">
            <strong>${isMyMessage ? "You" : senderDisplay}:</strong>
            <p class="${bgClass} rounded p-2">${message}</p>
            <small>${new Date(timestamp).toLocaleTimeString()}</small>
        </div>
    `;

        chatMessages.innerHTML += messageHtml;
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
    }



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

            // ✅ Immediately append message to sender UI
            const sentMessageHtml = `
            <div class="text-end mb-3">
                <strong>You:</strong>
                <p class="bg-primary text-white rounded p-2">${message}</p>
                <small>${new Date().toLocaleTimeString()}</small>
            </div>
        `;
            chatMessages.innerHTML += sentMessageHtml;
            chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message

            await connection.invoke("SendMessage", recipientId, message);
            console.log("Message sent via SignalR.");

            // Clear input after sending
            document.getElementById("messageInput").value = "";

        } catch (err) {
            console.error("Error sending message via SignalR:", err);
        }
    });


    // ✅ Setup Chat Function
    async function setupChat(userId, userEmail) {
        const chatHeader = document.getElementById("chatHeader");
        const chatMessages = document.getElementById("chatMessages");
        const activeUserNameElement = document.getElementById("activeUserName");

        activeUserNameElement.textContent = userEmail;
        activeUserNameElement.dataset.userId = userId;
        chatMessages.innerHTML = ""; // Clear previous chat messages

        let currentUserId = null;

        // ✅ Fetch current user ID before processing messages
        try {
            const response = await fetch("/api/users/me");
            if (response.ok) {
                const data = await response.json();
                currentUserId = data.userId; // Populate currentUserId
            } else {
                console.error("Failed to fetch current user.");
            }
        } catch (error) {
            console.error("Error fetching current user:", error);
        }

        try {
            const response = await fetch(`/api/Message/messages/${userId}`);
            const messages = await response.json();

            messages.forEach(msg => {
                const isMyMessage = msg.senderId === currentUserId; // ✅ Check if it's the current user's message
                appendMessage(isMyMessage ? "You" : userEmail, msg.message, msg.sentAt, msg.senderId, currentUserId);
            });

        } catch (err) {
            console.error("Error fetching chat history:", err);
        }
    }




    connection.onclose(err => {
        alert("Connection lost. Trying to reconnect...");
        setTimeout(() => connection.start().catch(err => console.error(err.toString())), 5000);
    });
});
