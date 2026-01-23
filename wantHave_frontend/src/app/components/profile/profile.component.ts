import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../interfaces/user-profile';
import { MyListingsComponent } from '../my-listings/my-listings.component';
import { MyTransactionsComponent } from '../my-transactions/my-transactions.component';
import { WatchlistComponent } from '../watchlist/watchlist.component';

interface MenuItem {
  icon: string;
  label: string;
  view?: 'listings' | 'transactions' | 'watchlist'; // For SPA navigation
  action?: () => void;
  badge?: string;
  route?: string; // Kept for legacy compatibility if needed
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MyListingsComponent, MyTransactionsComponent, WatchlistComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  profile: UserProfile | null = null;
  loading = true;
  error = '';
  activeView: 'overview' | 'edit' | 'listings' | 'transactions' | 'watchlist' = 'overview';
  // isEditMode = false; // Replaced by activeView
  saving = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  previewUrl: string | null = null;

  profileForm: FormGroup = this.fb.group({
    username: [''], // Read-only
    email: [''],    // Read-only
    first_name: [''],
    last_name: [''],
    zip_code: [''],
    city: [''],
    country: [''],
  });

  // Menu Logic
  isDarkTheme = true;

  mainMenuItems: MenuItem[] = [
    { icon: '📋', label: 'My Listings', view: 'listings', badge: '' },
    { icon: '💳', label: 'My Transactions', view: 'transactions' },
    { icon: '⭐', label: 'Watchlist', view: 'watchlist' },
  ];

  bottomMenuItems: MenuItem[] = [
    { icon: '👤', label: 'Profile/Settings', action: () => this.enableEditMode() },
  ];

  listings: any[] = [];
  purchases: any[] = [];
  listingsLoading = false;
  purchasesLoading = false;

  ngOnInit() {
    this.loadThemePreference();

    // Check if we should start in edit mode from query params and clean up URL
    this.route.queryParams.subscribe(params => {
      if (params['edit'] === 'true') {
        this.activeView = 'edit';
        // Remove query params from URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
    this.loadProfile();
  }

  loadThemePreference() {
    const savedTheme = localStorage.getItem('wanthave_theme');
    this.isDarkTheme = savedTheme !== 'light';
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('wanthave_theme', this.isDarkTheme ? 'dark' : 'light');
    // Apply theme changes to document
    document.body.classList.toggle('light-theme', !this.isDarkTheme);
  }

  getPublicProfileUrl(): string {
    return this.profile ? `/public-profile/${this.profile.id}` : '/';
  }

  loadProfile() {
    this.loading = true;
    this.profileService.getMe().subscribe({
      next: (data) => {
        this.profile = data;
        this.profileForm.patchValue({
          username: data.user.username,
          email: data.user.email,
          first_name: data.user.first_name || '',
          last_name: data.user.last_name || '',
          city: data.city || '',
          zip_code: data.zip_code || '',
          country: data.country || '',
        });
        this.loading = false;

        // Load additional data
        this.loadListings(data.id);
        this.loadPurchases();
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
        this.listings = data;
        this.listingsLoading = false;
      },
      error: (err) => {
        console.error('Failed to load listings', err);
        this.listingsLoading = false;
      },
    });
  }

  loadPurchases() {
    this.purchasesLoading = true;
    this.profileService.getPurchases().subscribe({
      next: (data) => {
        this.purchases = data;
        this.purchasesLoading = false;
      },
      error: (err) => {
        console.error('Failed to load purchases', err);
        this.purchasesLoading = false;
      },
    });
  }

  deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      this.profileService.deleteAccount().subscribe({
        next: () => {
          // Clear auth state before redirecting
          this.authService.logout();
          alert('Account deleted successfully.');
          window.location.href = '/';
        },
        error: (err) => {
          console.error('Delete failed', err);
          alert('Failed to delete account.');
        },
      });
    }
  }

  setView(view: 'overview' | 'edit' | 'listings' | 'transactions' | 'watchlist') {
    this.activeView = view;
  }

  enableEditMode() {
    this.setView('edit');
  }

  cancelEdit() {
    this.setView('overview');
    this.selectedFile = null;
    this.selectedFileName = '';
    if (this.profile) {
      this.profileForm.patchValue({
        username: this.profile.user.username,
        email: this.profile.user.email,
        first_name: this.profile.user.first_name || '',
        last_name: this.profile.user.last_name || '',
        city: this.profile.city || '',
        zip_code: this.profile.zip_code || '',
        country: this.profile.country || '',
      });
    }
    this.error = '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // Security Change States
  isChangingUsername = false;
  isChangingEmail = false;
  isChangingPassword = false;
  securitySuccess = '';
  securityError = '';
  securityForm: FormGroup = this.fb.group({
    username: [''],
    old_password: [''],
    new_password: [''],
    new_email: [''],
    current_password: [''] // for email change
  });

  emailChangeRequest() {
    this.isChangingEmail = true;
    this.isChangingPassword = false;
    this.isChangingUsername = false;
    this.securityForm.reset();
  }

  passwordChangeRequest() {
    this.isChangingPassword = true;
    this.isChangingEmail = false;
    this.isChangingUsername = false;
    this.securityForm.reset();
  }

  usernameChangeRequest() {
    this.isChangingUsername = true;
    this.isChangingEmail = false;
    this.isChangingPassword = false;
    this.securityForm.reset();
    if (this.profile) {
      this.securityForm.patchValue({ username: this.profile.user.username });
    }
  }

  cancelSecurityChange() {
    this.isChangingUsername = false;
    this.isChangingEmail = false;
    this.isChangingPassword = false;
    this.securityError = '';
    this.securitySuccess = '';
  }

  submitUsernameChange() {
    const { username, current_password } = this.securityForm.value;
    if (!username || !current_password) {
      this.securityError = 'Please enter username and password.';
      return;
    }

    if (this.profile && username === this.profile.user.username) {
      this.cancelSecurityChange();
      return;
    }

    this.saving = true;
    this.securityError = '';
    this.securitySuccess = '';
    this.profileService.changeUsername({ new_username: username, password: current_password }).subscribe({
      next: (data) => {
        this.securitySuccess = 'Username changed successfully.';
        if (this.profile && this.profile.user) {
          this.profile.user.username = data.username;
        }
        // Update auth state (header, localStorage)
        this.authService.updateUsername(data.username);

        // Update main form as well
        this.profileForm.patchValue({ username: data.username });
        this.saving = false;
        this.securityForm.reset();
        setTimeout(() => this.cancelSecurityChange(), 2000);
      },
      error: (err) => {
        console.error(err);
        this.handleSecurityError(err);
        this.saving = false;
      }
    });
  }

  submitPasswordChange() {
    const { old_password, new_password } = this.securityForm.value;
    if (!old_password || !new_password) {
      this.securityError = 'Please fill in all fields.';
      return;
    }

    this.saving = true;
    this.securityError = '';
    this.securitySuccess = '';
    this.profileService.changePassword({ old_password, new_password }).subscribe({
      next: () => {
        this.securitySuccess = 'Password changed successfully.';
        this.saving = false;
        this.securityForm.reset();
        setTimeout(() => this.cancelSecurityChange(), 2000);
      },
      error: (err) => {
        console.error(err);
        this.handleSecurityError(err);
        this.saving = false;
      }
    });
  }

  submitEmailChange() {
    const { new_email, current_password } = this.securityForm.value;
    if (!new_email || !current_password) {
      this.securityError = 'Please fill in all fields.';
      return;
    }

    this.saving = true;
    this.securityError = '';
    this.securitySuccess = '';
    this.profileService.changeEmail({ new_email, password: current_password }).subscribe({
      next: () => {
        this.securitySuccess = 'Email changed successfully.';
        // Update local profile email
        if (this.profile && this.profile.user) {
          this.profile.user.email = new_email;
          this.profileForm.patchValue({ email: new_email });
        }
        this.saving = false;
        this.securityForm.reset();
        setTimeout(() => this.cancelSecurityChange(), 2000);
      },
      error: (err) => {
        console.error(err);
        this.handleSecurityError(err);
        this.saving = false;
      }
    });
  }

  private handleError(err: any) {
    console.error('Profile Error:', err);
    this.saving = false;

    if (err.status === 0) {
      this.error = 'Network error. Please check your internet connection.';
      return;
    }

    if (err.status >= 500) {
      this.error = 'Server error. Please try again later.';
      return;
    }

    if (err.error) {
      if (typeof err.error === 'string') {
        this.error = err.error;
      } else if (err.error.detail) {
        this.error = err.error.detail;
      } else {
        // Format field errors clearly
        const messages: string[] = [];
        Object.entries(err.error).forEach(([key, value]) => {
          const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
          // Handle array of errors or single string
          const errorMsg = Array.isArray(value) ? value.join(', ') : value;
          messages.push(`${fieldName}: ${errorMsg}`);
        });
        this.error = messages.join('\n'); // We will use white-space: pre-line in CSS
      }
    } else {
      this.error = 'An unexpected error occurred.';
    }
  }

  private handleSecurityError(err: any) {
    console.error('Security Error:', err);
    this.saving = false;

    if (err.status === 0) {
      this.securityError = 'Network error. Please check your internet connection.';
      return;
    }

    if (err.status >= 500) {
      this.securityError = 'Server error. Please try again later.';
      return;
    }

    if (err.error) {
      if (typeof err.error === 'string') {
        this.securityError = err.error;
      } else if (err.error.detail) {
        this.securityError = err.error.detail;
      } else {
        const messages: string[] = [];
        Object.entries(err.error).forEach(([key, value]) => {
          // Skip 'non_field_errors' prefix if possible, or just format nicely
          if (key === 'non_field_errors') {
            messages.push(Array.isArray(value) ? value.join(' ') : value as string);
          } else {
            const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
            const errorMsg = Array.isArray(value) ? value.join(', ') : value;
            messages.push(`${fieldName}: ${errorMsg}`);
          }
        });
        this.securityError = messages.join('\n');
      }
    } else {
      this.securityError = 'An unexpected error occurred.';
    }
  }



  saveProfile() {
    if (this.profileForm.invalid) {
      return;
    }

    this.saving = true;
    this.error = '';

    const formValue = this.profileForm.value;

    // Create FormData for file upload support
    const formData = new FormData();
    formData.append('first_name', formValue.first_name || '');
    formData.append('last_name', formValue.last_name || '');
    formData.append('city', formValue.city || '');
    formData.append('zip_code', formValue.zip_code || '');
    formData.append('country', formValue.country || '');

    // Add profile picture if selected
    if (this.selectedFile) {
      formData.append('profile_picture', this.selectedFile);
    }

    this.profileService.updateMeWithFormData(formData).subscribe({
      next: (data) => {
        this.profile = data;
        this.activeView = 'overview';
        this.saving = false;
        this.selectedFile = null;
        this.selectedFileName = '';
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to save profile. Please try again.';
        this.saving = false;
      },
    });
  }
}
