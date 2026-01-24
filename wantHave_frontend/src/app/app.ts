import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';
import { FooterComponent } from './components/footer/footer.component';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatBadgeModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  auth = inject(AuthService);
  chatService = inject(ChatService);
  router = inject(Router);
  unreadCount = 0;
  private pollSubscription: Subscription | null = null;

  // Mobile menu state
  isMobileMenuOpen = signal(false);
  isMobile = signal(false);
  private readonly MOBILE_BREAKPOINT = 768;

  ngOnInit() {
    this.startPolling();
    this.checkMobile();
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile() {
    this.isMobile.set(window.innerWidth < this.MOBILE_BREAKPOINT);
    // Close menu when switching to desktop
    if (!this.isMobile()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
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
