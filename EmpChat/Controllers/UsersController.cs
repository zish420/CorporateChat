using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmpChat.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
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
    }
}
