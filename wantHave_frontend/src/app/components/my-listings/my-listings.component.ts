import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';

@Component({
    selector: 'app-my-listings',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './my-listings.component.html',
    styleUrls: ['./my-listings.component.scss'],
})
export class MyListingsComponent implements OnInit {
    @Output() goBack = new EventEmitter<void>();
    private profileService = inject(ProfileService);

    listings: any[] = [];
    loading = true;
    error = '';
    userId: number | null = null;

    ngOnInit() {
        this.loadProfile();
    }

    loadProfile() {
        this.profileService.getMe().subscribe({
            next: (profile) => {
                this.userId = profile.id;
                this.loadListings();
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load profile.';
                this.loading = false;
            },
        });
    }

    loadListings() {
        if (!this.userId) return;

        this.profileService.getListings(this.userId).subscribe({
            next: (data) => {
                this.listings = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load listings.';
                this.loading = false;
            },
        });
    }
}
