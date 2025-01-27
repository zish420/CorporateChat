using EmpChat.Data;
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

        public async Task SendMessage(string senderId, string receiverId, string message)
        {
            Console.WriteLine($"Sender: {senderId}, Receiver: {receiverId}, Message: {message}");

            var actualSenderId = _userManager.GetUserId(Context.User);
            if (string.IsNullOrEmpty(actualSenderId))
            {
                Console.WriteLine("Error: actualSenderId is null or empty.");
                return;
            }

            if (actualSenderId != senderId)
            {
                Console.WriteLine("Unauthorized sender ID.");
                throw new UnauthorizedAccessException("Sender ID does not match the authenticated user.");
            }

            // Save the message
            var chatMessage = new ChatMessage
            {
                SenderId = actualSenderId,
                ReceiverId = receiverId,
                Message = message,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            try
            {
                await _context.SaveChangesAsync();
                Console.WriteLine("Message saved to database.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving message: {ex.Message}");
                throw;
            }

            // Notify users
            try
            {
                await Clients.User(senderId).SendAsync("ReceiveMessage", receiverId, message);
                await Clients.User(receiverId).SendAsync("ReceiveMessage", senderId, message);
                Console.WriteLine("Message sent to both sender and receiver.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error notifying users: {ex.Message}");
            }
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
