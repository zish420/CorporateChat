using EmpChat.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;

namespace EmpChat.Hubs
{
    public class ChatHub : Hub
    {
        private readonly UserManager<Employee> _userManager;
        private static readonly Dictionary<string, string> UserConnections = new();

        public ChatHub(UserManager<Employee> userManager)
        {
            _userManager = userManager;
        }
        
        public override async Task OnConnectedAsync()
        {
            var user = await _userManager.GetUserAsync(Context.User);
            var userId = user?.UserName;

            if (!string.IsNullOrEmpty(userId))
            {
                UserConnections[userId] = Context.ConnectionId; // Store user and their connection
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            var user = await _userManager.GetUserAsync(Context.User);
            var userId = user?.UserName;

            if (!string.IsNullOrEmpty(userId))
            {
                UserConnections.Remove(userId); // Remove mapping
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessageToUser(string targetUser, string message)
        {
            if (UserConnections.TryGetValue(targetUser, out var connectionId))
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", Context.User.Identity.Name, message);
            }
        }
    }

}
