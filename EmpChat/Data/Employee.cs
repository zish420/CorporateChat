using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace EmpChat.Data
{
    public class Employee : IdentityUser
    {
        [StringLength(100)]
        public string? Name { get; set; }

        
        [EmailAddress]
        public string? Email { get; set; }


        [StringLength(100)]
        public string? Department { get; set; }


        [StringLength(100)]
        public string? Position { get; set; }


        [Range(0, double.MaxValue, ErrorMessage = "Salary must be a positive number.")]
        public decimal? Salary { get; set; }


        public string? Role { get; set; }
    }
}
