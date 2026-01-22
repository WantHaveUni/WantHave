import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../interfaces/user-profile';

@Component({
    selector: 'app-public-profile',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './public-profile.component.html',
    styleUrls: ['./public-profile.component.scss'],
})
export class PublicProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private profileService = inject(ProfileService);

    profile: UserProfile | null = null;
    loading = true;
    error = '';
    listings: any[] = [];
    listingsLoading = false;
    isOwnProfile = false;

    ngOnInit() {
        const userId = this.route.snapshot.paramMap.get('id');
        if (userId) {
            this.loadPublicProfile(parseInt(userId, 10));
        } else {
            // If no ID, load current user's profile
            this.loadCurrentUserProfile();
        }
    }

    loadCurrentUserProfile() {
        this.profileService.getMe().subscribe({
            next: (data) => {
                this.profile = data;
                this.isOwnProfile = true;
                this.loading = false;
                this.loadListings(data.id);
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load profile.';
                this.loading = false;
            },
        });
    }

    loadPublicProfile(userId: number) {
        this.profileService.getPublicProfile(userId).subscribe({
            next: (data) => {
                this.profile = data;
                this.loading = false;
                this.loadListings(data.id);
                // Check if this is the current user's profile
                this.profileService.getMe().subscribe({
                    next: (me) => {
                        this.isOwnProfile = me.id === data.id;
                    },
                    error: () => {
                        this.isOwnProfile = false;
                    },
                });
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load profile.';
                this.loading = false;
            },
        });
    }

    loadListings(userId: number) {
        this.listingsLoading = true;
        this.profileService.getListings(userId).subscribe({
            next: (data) => {
                // Only show available listings on public profile
                this.listings = data.filter((item: any) => item.status === 'AVAILABLE');
                this.listingsLoading = false;
            },
            error: (err) => {
                console.error('Failed to load listings', err);
                this.listingsLoading = false;
            },
        });
    }

    goBack() {
        this.router.navigate(['/products']);
    }

    editProfile() {
        this.router.navigate(['/profile']);
    }

    viewListing(listingId: number) {
        this.router.navigate(['/products', listingId]);
    }
}
