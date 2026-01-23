import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';

@Component({
    selector: 'app-watchlist',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './watchlist.component.html',
    styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent implements OnInit {
    @Output() goBack = new EventEmitter<void>();
    private profileService = inject(ProfileService);

    watchlist: any[] = [];
    loading = true;
    error = '';

    ngOnInit() {
        this.loadWatchlist();
    }

    loadWatchlist() {
        this.profileService.getWatchlist().subscribe({
            next: (data) => {
                this.watchlist = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                // If endpoint doesn't exist yet, show empty state
                this.watchlist = [];
                this.loading = false;
            },
        });
    }

    removeFromWatchlist(productId: number, event: Event) {
        event.preventDefault();
        event.stopPropagation();

        this.profileService.removeFromWatchlist(productId).subscribe({
            next: () => {
                this.watchlist = this.watchlist.filter(item => item.product.id !== productId);
            },
            error: (err) => {
                console.error('Failed to remove from watchlist', err);
            },
        });
    }

    imageUrl(product: any): string | null {
        if (!product?.image) {
            return null;
        }
        if (product.image.startsWith('http')) {
            return product.image;
        }
        return product.image.startsWith('/') ? product.image : `/${product.image}`;
    }
}
