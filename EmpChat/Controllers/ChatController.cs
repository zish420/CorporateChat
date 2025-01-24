using Microsoft.AspNetCore.Mvc;

namespace EmpChat.Controllers
{
    public class ChatController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
        public IActionResult Index2()
        {
            return View();
        }
    }

}
