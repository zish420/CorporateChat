using EmpChat.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmpChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<Employee> _userManager;
        public UsersController(AppDbContext context, UserManager<Employee> userManager)
        {
            _context = context;
            _userManager = userManager;

        }

        [Route("search")]
        [HttpGet]
        public async Task<IActionResult> SearchUsers(string query)
        {
            var users = await _context.Users
                .Where(u => u.UserName.Contains(query))
                .Select(u => new { u.Id, u.UserName })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserById(string userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            return Ok(new { user.Id, user.Email, user.UserName });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUserId()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized(new { message = "User not found" });
            }

            return Ok(new { userId = user.Id });
        }
    }
}
