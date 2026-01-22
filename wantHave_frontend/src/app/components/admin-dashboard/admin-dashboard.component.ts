import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, User } from '../../services/admin.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, MatCardModule, MatButtonModule, MatTableModule, MatIconModule],
    templateUrl: './admin-dashboard.component.html',
    styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
    private adminService = inject(AdminService);
    users: User[] = [];
    displayedColumns: string[] = ['id', 'username', 'email', 'name', 'actions'];

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.adminService.getUsers().subscribe({
            next: (users) => this.users = users,
            error: (err) => console.error('Failed to load users', err)
        });
    }

    deleteUser(user: User) {
        if (user.id === 1) {
            alert('Cannot delete the main admin user.');
            return;
        }
        if (confirm(`Are you sure you want to delete user ${user.username}? This cannot be undone.`)) {
            this.adminService.deleteUser(user.id).subscribe({
                next: () => {
                    this.users = this.users.filter(u => u.id !== user.id);
                },
                error: (err) => alert('Failed to delete user: ' + (err.error?.detail || err.message))
            });
        }
    }
}
