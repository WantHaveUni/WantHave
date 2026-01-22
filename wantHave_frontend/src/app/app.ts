import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { FooterComponent } from './components/footer/footer.component';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatBadgeModule, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  auth = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);
  unreadCount = 0;
  private pollSubscription: Subscription | null = null;

  ngOnInit() {
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  startPolling() {
    // Poll every 10 seconds for unread messages if authenticated
    this.pollSubscription = interval(10000).pipe(
      switchMap(() => {
        if (this.auth.isAuthenticated()) {
          return this.chatService.getUnreadCount();
        }
        return [];
      })
    ).subscribe({
      next: (response: any) => {
        if (response && typeof response.unread_count === 'number') {
          this.unreadCount = response.unread_count;
        }
      },
      error: (err) => console.error('Failed to poll unread count', err)
    });

    // Also fetch immediately on load
    if (this.auth.isAuthenticated()) {
      this.chatService.getUnreadCount().subscribe({
        next: (res) => this.unreadCount = res.unread_count,
        error: () => { }
      });
    }
  }

  logout() {
    this.auth.logout();
    this.unreadCount = 0;
  }
}
