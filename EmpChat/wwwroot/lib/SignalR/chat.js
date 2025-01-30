document.addEventListener("DOMContentLoaded", () => {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/chathub")
        .withAutomaticReconnect()
        .build();

    // Start SignalR Connection
    connection.start()
        .then(() => console.log("SignalR connection established."))
        .catch(err => console.error("SignalR connection error:", err));

    // Listen for incoming messages
    connection.on("ReceiveMessage", (senderId, message, timestamp, senderEmail) => {
        const chatMessages = document.getElementById("chatMessages");
        const currentUserId = document.getElementById("currentUserId").value;

        console.log("Message received from:", senderEmail); // Debugging

        // If the message is from another user, show a notification
        if (senderId !== currentUserId) {
            const userConfirmed = confirm(`New message from ${senderEmail}: ${message}\nClick OK to open chat.`);
            if (userConfirmed) {
                setupChat(senderId, senderEmail); // 🔥 Switch to sender's chat automatically
            }
        }

        // ✅ Append the received message correctly
        const isMyMessage = senderId === currentUserId;
        appendMessage(senderEmail, message, timestamp, isMyMessage);
    });

    // Function to append messages properly
    function appendMessage(senderDisplay, message, timestamp, isMyMessage) {
        const chatMessages = document.getElementById("chatMessages");

        // ✅ Correct alignment for sent & received messages
        const alignment = isMyMessage ? "text-end" : "text-start";
        const bgClass = isMyMessage ? "bg-primary text-white" : "bg-secondary text-dark";

        const messageHtml = `
        <div class="${alignment} mb-3">
            <strong>${senderDisplay}:</strong>
            <p class="${bgClass} rounded p-2">${message}</p>
            <small>${new Date(timestamp).toLocaleTimeString()}</small>
        </div>
    `;

        chatMessages.innerHTML += messageHtml;
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
    }


    ////// Function to append messages properly
    ////function appendMessage(senderDisplay, message, timestamp, isMyMessage) {
    ////    const chatMessages = document.getElementById("chatMessages");

    ////    const alignment = isMyMessage ? "text-end" : "text-start";
    ////    const bgClass = isMyMessage ? "bg-primary text-white" : "bg-secondary text-dark";

    ////    const messageHtml = `
    ////    <div class="${alignment} mb-3">
    ////        <strong>${senderDisplay}:</strong>
    ////        <p class="${bgClass} rounded p-2">${message}</p>
    ////        <small>${new Date(timestamp).toLocaleTimeString()}</small>
    ////    </div>
    ////`;

    //    chatMessages.innerHTML += messageHtml;
    //    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
    //}


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


    // 🔄 Updated Search Users Dynamically
    document.getElementById("searchUser").addEventListener("input", async function () {
        const query = this.value.trim();
        const userList = document.getElementById("userList");
        userList.innerHTML = ""; // Clear current list

        if (query.length < 2) return; // Fetch only if query is meaningful

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
        }
    });

    // 🔄 Updated Setup Chat Function
    function setupChat(userId, userEmail) {
        const chatHeader = document.getElementById("chatHeader");
        const chatMessages = document.getElementById("chatMessages");
        const activeUserNameElement = document.getElementById("activeUserName");

        // Set active user in the header
        chatHeader.querySelector("img").src = "/lib/Sound/profile.png";
        activeUserNameElement.textContent = userEmail;

        // ✅ Ensure dataset.userId is set correctly
        activeUserNameElement.dataset.userId = userId;

        // Clear chat messages and set up chat
        chatMessages.innerHTML = `<h4>Chatting with ${userEmail}</h4>`;
    }

    connection.onclose(err => {
        alert("Connection lost. Trying to reconnect...");
        setTimeout(() => connection.start().catch(err => console.error(err.toString())), 5000); // Reconnect after 5 seconds
    });
});
