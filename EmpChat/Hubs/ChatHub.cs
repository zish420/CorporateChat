﻿using EmpChat.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace EmpChat.Hubs
{
    public class ChatHub : Hub
    {
        private readonly UserManager<Employee> _userManager;
        private readonly AppDbContext _context;

        public ChatHub(UserManager<Employee> userManager, AppDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        public async Task SendMessage(string receiverId, string message)
        {
            var senderId = Context.UserIdentifier; // Retrieves authenticated user's ID

            if (string.IsNullOrEmpty(senderId))
            {
                Console.WriteLine("Unauthorized sender. Message not sent.");
                return;
            }

            Console.WriteLine($"Sender: {senderId}, Receiver: {receiverId}, Message: {message}");

            var chatMessage = new ChatMessage
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                Message = message,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // Notify both sender and receiver via SignalR
            await Clients.User(senderId).SendAsync("ReceiveMessage", senderId, message, chatMessage.SentAt);
            await Clients.User(receiverId).SendAsync("ReceiveMessage", senderId, message, chatMessage.SentAt);
        }

        public override async Task OnConnectedAsync()
        {
            var userId = _userManager.GetUserId(Context.User);
            if (!string.IsNullOrEmpty(userId))
            {
                Console.WriteLine($"User {userId} connected with ConnectionId: {Context.ConnectionId}");
                await Groups.AddToGroupAsync(Context.ConnectionId, userId);
            }
            else
            {
                Console.WriteLine("Error: Connected user has no ID.");
            }

            await base.OnConnectedAsync();
        }


        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Remove user from the group
            var user = Context.User;
            if (user != null)
            {
                var userId = _userManager.GetUserId(user);
                Console.WriteLine($"User {userId} disconnected.");

                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
            }
            await base.OnDisconnectedAsync(exception);
        }
    }

}
