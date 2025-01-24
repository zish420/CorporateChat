//const connection = new signalR.HubConnectionBuilder()
//    .withUrl("/chatHub")
//    .build();

//// Initialize SignalR connection
//connection.start().catch(function (err) {
//    console.error("SignalR connection error:", err.toString());
//});

//// Search users dynamically and populate the user list
//document.getElementById("searchUser").addEventListener("input", async function () {
//    const query = this.value.trim();
//    const userList = document.getElementById("userList");
//    userList.innerHTML = ""; // Clear current list

//    if (query.length < 2) return; // Fetch only if query is meaningful

//    try {
//        const response = await fetch(`/api/users/search?query=${query}`);
//        const users = await response.json();

//        if (users.length === 0) {
//            userList.innerHTML = `<li class="list-group-item">No users found</li>`;
//            return;
//        }

//        users.forEach(user => {
//            const li = document.createElement("li");
//            li.classList.add("list-group-item", "d-flex", "align-items-center");
//            li.dataset.userId = user.id; // Store user ID in the list item
//            li.innerHTML = `
//                <img src="https://via.placeholder.com/40" alt="Profile Pic" class="rounded-circle me-2">
//                <span>${user.userName}</span>
//            `;
//            li.onclick = () => {
//                setupChat(user.id, user.userName);
//                document.getElementById("searchUser").value = user.userName;
//                userList.innerHTML = ""; // Clear suggestions once a user is selected
//            };
//            userList.appendChild(li);
//        });
//    } catch (err) {
//        console.error("Error fetching users:", err);
//    }
//});

//// Setup chat for the selected user
//async function setupChat(userId, userName) {
//    const chatHeader = document.getElementById("chatHeader");
//    const chatMessages = document.getElementById("chatMessages");

//    // Set active user in the header
//    chatHeader.querySelector("img").src = "https://via.placeholder.com/50"; // Replace with actual profile pic
//    document.getElementById("activeUserName").textContent = userName;

//    // Save the user ID to a data attribute for later use
//    document.getElementById("sendMessage").dataset.targetUserId = userId;

//    // Load chat history if needed (optional)
//    try {
//        const response = await fetch(`/api/chats/history?userId=${userId}`);
//        const messages = await response.json();
//        messages.forEach(msg => {
//            appendMessage(msg.sender, msg.content, msg.sender === "You");
//        });
//    } catch (err) {
//        console.error("Error loading chat history:", err);
//    }
//}

//// Sending messages
//document.getElementById("sendMessage").onclick = function () {
//    const messageInput = document.getElementById("messageInput");
//    const message = messageInput.value.trim();
//    const targetUserId = document.getElementById("searchUser").dataset.userId;

//    if (!targetUserId) {
//        alert("Please select a user to chat with!");
//        return;
//    }

//    if (!message) {
//        alert("Message cannot be empty!");
//        return;
//    }

//    connection.invoke("SendMessageToUser", targetUserId, message).catch(function (err) {
//        console.error("Error sending message:", err.toString());
//    });

//    // Append your own message to the chat
//    appendMessage("You", message, true);
//    messageInput.value = ""; // Clear the input field
//};

//// Handle receiving messages
//connection.on("ReceiveMessage", function (sender, message) {
//    appendMessage(sender, message, false);
//});

//// Function to append a message to the chat window
//function appendMessage(sender, message, isOwnMessage) {
//    const chatMessages = document.getElementById("chatMessages");
//    const messageHtml = `
//        <div class="${isOwnMessage ? "text-end" : ""} mb-3">
//            <strong>${sender}:</strong>
//            <p class="${isOwnMessage ? "bg-primary text-white" : "bg-light"} rounded p-2">${message}</p>
//        </div>
//    `;
//    chatMessages.innerHTML += messageHtml;
//    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to the bottom
//}

// Establish SignalR connection for real-time messaging (optional, if used)
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub") // Ensure this matches your SignalR Hub endpoint
    .build();

// DOM Elements
const searchInput = document.getElementById("searchUser");
const userList = document.getElementById("userList");
const chatHeader = document.getElementById("chatHeader");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessage");

// Active chat variables
let activeChatUserId = null;
let activeChatUserName = null;

// Search Users Dynamically
searchInput.addEventListener("input", async function () {
    const query = this.value.trim();
    userList.innerHTML = ""; // Clear current suggestions

    if (query.length < 2) return; // Only search for meaningful input

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
                <img src="https://via.placeholder.com/40" alt="Profile Pic" class="rounded-circle me-2">
                <span>${user.userName}</span>
            `;
            li.onclick = () => setupChat(user.id, user.userName);
            userList.appendChild(li);
        });
    } catch (err) {
        console.error("Error fetching users:", err);
    }
});

// Setup Chat
function setupChat(userId, userName) {
    activeChatUserId = userId;
    activeChatUserName = userName;

    // Update chat header
    chatHeader.querySelector("img").src = "https://via.placeholder.com/50"; // Replace with actual profile pic
    document.getElementById("activeUserName").textContent = userName;

    // Clear chat messages
    chatMessages.innerHTML = `<h4 class="text-center">Chatting with ${userName}</h4>`;

    // Optionally, load previous messages from the database
    loadChatMessages(userId);
}

// Load Chat Messages (Optional)
async function loadChatMessages(userId) {
    try {
        const response = await fetch(`/api/chats/${userId}`); // Adjust API endpoint as needed
        const messages = await response.json();

        // Display messages in the chat area
        chatMessages.innerHTML = "";
        messages.forEach(message => {
            const messageElement = document.createElement("div");
            messageElement.classList.add("mb-3");
            if (message.senderId === activeChatUserId) {
                messageElement.innerHTML = `
                    <strong>${activeChatUserName}:</strong>
                    <p class="bg-light rounded p-2">${message.content}</p>
                `;
            } else {
                messageElement.classList.add("text-end");
                messageElement.innerHTML = `
                    <strong>You:</strong>
                    <p class="bg-primary text-white rounded p-2">${message.content}</p>
                `;
            }
            chatMessages.appendChild(messageElement);
        });

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
        console.error("Error loading chat messages:", err);
    }
}

// Send Message
sendMessageButton.addEventListener("click", async function () {
    const message = messageInput.value.trim();
    if (!message) {
        alert("Message cannot be empty!");
        return;
    }
    // Log to confirm the message is being sent
    console.log("Sending message:", message);
    // Display the message in the chat
    displayMessage("You", message, true);

    //// Optionally, send the message to the server
    //try {
    //    await fetch(`/api/chats/send`, {
    //        method: "POST",
    //        headers: { "Content-Type": "application/json" },
    //        body: JSON.stringify({
    //            recipientId: activeChatUserId,
    //            content: message
    //        })
    //    });
    //} catch (err) {
    //    console.error("Error sending message:", err);
    //}

    // Clear the input field
    messageInput.value = "";
});

// Display Message
function displayMessage(sender, content, isOutgoing = false) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("mb-3");

    if (isOutgoing) {
        messageElement.classList.add("text-end");
        messageElement.innerHTML = `
            <strong>${sender}:</strong>
            <p class="bg-primary text-white rounded p-2">${content}</p>
        `;
    } else {
        messageElement.innerHTML = `
            <strong>${sender}:</strong>
            <p class="bg-light rounded p-2">${content}</p>
        `;
    }

    chatMessages.appendChild(messageElement);

    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// SignalR Real-Time Messaging (Optional)
connection.on("ReceiveMessage", function (senderId, senderName, content) {
    console.log(`Received message from ${sender}: ${message}`);
    if (senderId === activeChatUserId) {
        displayMessage(senderName, content, false);
    }
});

connection.start().catch(function (err) {
    console.error("SignalR connection error:", err.toString());
});


