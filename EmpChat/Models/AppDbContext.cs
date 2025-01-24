using EmpChat.Data;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

public class AppDbContext : IdentityDbContext<Employee>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Add the DbSet for Employee
    public DbSet<Employee> Employees { get; set; } = default!;
    public DbSet<ChatMessage> ChatMessages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure additional properties for Employee if needed
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.Property(e => e.Department).HasMaxLength(100);
            entity.Property(e => e.Position).HasMaxLength(100);
            entity.Property(e => e.Salary).HasPrecision(18, 2);
            entity.Property(e => e.Role).HasMaxLength(50);
        });
    }
}