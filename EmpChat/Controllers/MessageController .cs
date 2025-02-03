using EmpChat.Data;
using EmpChat.Hubs;
using EmpChat.Views.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EmpChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessageController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _chatHub;
        public MessageController(AppDbContext context, IHubContext<ChatHub> chatHub)
        {
            _context = context;
            _chatHub = chatHub;
        }

        [HttpGet("messages/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetMessages(string userId)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            Console.WriteLine($"Fetching messages between {currentUserId} and {userId}");

            var messages = await _context.ChatMessages
                .Where(m => (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                            (m.SenderId == userId && m.ReceiverId == currentUserId))
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            Console.WriteLine($"Messages found: {messages.Count}");

            return Ok(messages);
        }

        [HttpGet("recent-chats")]
        [Authorize]
        public async Task<IActionResult> GetRecentChats()
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

            var recentChats = await _context.ChatMessages
                .Where(m => m.SenderId == currentUserId || m.ReceiverId == currentUserId)
                .GroupBy(m => m.SenderId == currentUserId ? m.ReceiverId : m.SenderId)
                .Select(g => new
                {
                    ChatPartnerId = g.Key,
                    LastMessageTime = g.Max(m => m.SentAt)
                })
                .OrderByDescending(g => g.LastMessageTime)
                .ToListAsync();

            return Ok(recentChats);
        }



        [HttpPost("send")]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageModel model)
        {
            var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(senderId))
            {
                return Unauthorized("User is not authenticated.");
            }

            if (string.IsNullOrEmpty(model.ReceiverId) || string.IsNullOrEmpty(model.Message))
            {
                return BadRequest("Receiver ID and message content cannot be empty.");
            }

            // Get the ChatHub instance
            var chatHub = (ChatHub)_chatHub as ChatHub;

            if (chatHub == null)
            {
                return StatusCode(500, "ChatHub is not available.");
            }

            await chatHub.SendMessage(model.ReceiverId, model.Message);

            return Ok(new { success = true });
        }

        public class SendMessageModel
        {
            public string ReceiverId { get; set; }
            public string Message { get; set; }
        }
    }
}
