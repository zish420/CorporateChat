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

        public Index2Model(UserManager<Employee> userManager)
        {
            _userManager = userManager;
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
    }
}
