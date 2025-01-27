const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chathub")
    .build();

// Start the SignalR connection
connection.start()
    .then(() => console.log("SignalR connection established."))
    .catch(err => console.error("SignalR connection error:", err));

// Listen for incoming messages
connection.on("ReceiveMessage", (senderId, message) => {
    // Display a notification
    alert(`New message from ${senderId}: ${message}`);
    console.log(`Message received from ${senderId}: ${message}`);

    // Add the message to the chat area
    const messageHtml = `<div class="text-start mb-3">
        <strong>${senderId}:</strong>
        <p class="bg-light rounded p-2">${message}</p>
    </div>`;
    document.getElementById("chatMessages").innerHTML += messageHtml;
});

// Send message to the server
document.getElementById("sendMessage").addEventListener("click", () => {
    const recipientId = document.getElementById("activeUserName").dataset.userId; // The selected recipient
    const message = document.getElementById("messageInput").value;

    if (!recipientId || !message.trim()) {
        alert("Select a user and type a message before sending.");
        return;
    }

    connection.invoke("SendMessage", recipientId, message)
        .then(() => {
            // Add the message to the chat UI
            const messageHtml = `<div class="text-end mb-3">
                <strong>You:</strong>
                <p class="bg-primary text-white rounded p-2">${message}</p>
            </div>`;
            document.getElementById("chatMessages").innerHTML += messageHtml;

            document.getElementById("messageInput").value = ""; // Clear the input
        })
        .catch(err => console.error("Error sending message:", err));
});


// Search users and populate the list
document.getElementById("searchUser").addEventListener("keydown", async function (event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission or page reload

        const query = this.value.trim();
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
});

let activeRecipientId = null; // Global variable to store the active user's ID

async function setupChat(userId, userName) {
    const chatHeader = document.getElementById("chatHeader");
    const chatMessages = document.getElementById("chatMessages");

    activeRecipientId = userId;
    chatHeader.querySelector("img").src = "/lib/Sound/profile.png";
    const activeUserNameElement = document.getElementById("activeUserName");
    activeUserNameElement.textContent = userName;
    activeUserNameElement.dataset.userId = userId; 

    // Fetch previous messages
    try {
        const response = await fetch(`/api/messages?userId=${userId}`);
        const messages = await response.json();

        chatHeader.querySelector("img").src = "/lib/Sound/profile.png";
        const activeUserNameElement = document.getElementById("activeUserName");
        activeUserNameElement.textContent = userName;
        activeUserNameElement.dataset.userId = userId;

        chatMessages.innerHTML = `<h4>Chatting with ${userName}</h4>`;
        messages.forEach(msg => {
            const alignment = msg.senderId === currentUserId ? "text-end" : "text-start";
            const bgClass = msg.senderId === currentUserId ? "bg-primary text-white" : "bg-light";
            chatMessages.innerHTML += `
                <div class="${alignment} mb-3">
                    <strong>${msg.senderName}:</strong>
                    <p class="${bgClass} rounded p-2">${msg.message}</p>
                </div>
            `;
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error("Error fetching messages:", err);
    }

}

connection.onclose(err => {
    alert("Connection lost. Trying to reconnect...");
    setTimeout(() => connection.start().catch(err => console.error(err.toString())), 5000); // Reconnect after 5 seconds
});