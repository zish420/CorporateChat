using EmpChat.Data;
using EmpChat.Hubs;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace EmpChat.Views.Chat
{
    public class Index2Model : PageModel
    {
        private readonly UserManager<Employee> _userManager;
        private readonly IHubContext<ChatHub> _chatHub;
        private readonly AppDbContext _context;

        public Index2Model(UserManager<Employee> userManager, IHubContext<ChatHub> chatHub, AppDbContext context)
        {
            _userManager = userManager;
            _chatHub = chatHub;
            _context = context;
        }

        public Employee CurrentUser { get; set; }

        public async Task<IActionResult> OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            CurrentUser = await _userManager.FindByIdAsync(userId);
            return Page();
        }

        [HttpPost]
        public async Task<IActionResult> OnPostSendMessageAsync([FromBody] ChatMessage model)
        {
            if (!ModelState.IsValid || string.IsNullOrEmpty(model.ReceiverId) || string.IsNullOrEmpty(model.Message))
            {
                return BadRequest("Invalid message data.");
            }

            var senderId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(senderId))
            {
                return Unauthorized();
            }

            // Save message to the database
            var chatMessage = new ChatMessage
            {
                SenderId = senderId,
                ReceiverId = model.ReceiverId,
                Message = model.Message,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // Send message via SignalR to both sender and receiver
            await _chatHub.Clients.User(model.ReceiverId).SendAsync("ReceiveMessage", senderId, model.Message, chatMessage.SentAt);
            await _chatHub.Clients.User(senderId).SendAsync("ReceiveMessage", senderId, model.Message, chatMessage.SentAt);

            return new JsonResult(new { success = true, timestamp = chatMessage.SentAt });
        }
    }
}
