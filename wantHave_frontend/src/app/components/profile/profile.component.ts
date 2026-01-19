import { Component, OnInit, inject, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../interfaces/user-profile';
import * as L from 'leaflet';

// Fix for default marker icons
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);

  profile: UserProfile | null = null;
  loading = true;
  error = '';
  isEditMode = false;
  saving = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';

  private map: L.Map | undefined;
  private marker: L.Marker | undefined;

  profileForm: FormGroup = this.fb.group({
    bio: [''],
    city: [''],
    country: [''],
    address: [''],
    latitude: [null],
    longitude: [null],
  });

  listings: any[] = [];
  purchases: any[] = [];
  listingsLoading = false;
  purchasesLoading = false;

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.profileService.getMe().subscribe({
      next: (data) => {
        this.profile = data;
        this.profileForm.patchValue({
          bio: data.bio || '',
          city: data.city || '',
          country: data.country || '',
          address: data.address || '',
          latitude: data.latitude,
          longitude: data.longitude,
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
          alert('Account deleted successfully.');
          window.location.href = '/'; // Refresh/Redirect
        },
        error: (err) => {
          console.error('Delete failed', err);
          alert('Failed to delete account.');
        },
      });
    }
  }

  enableEditMode() {
    this.isEditMode = true;
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const lat = this.profileForm.get('latitude')?.value || 47.0707; // Default to Graz
    const lng = this.profileForm.get('longitude')?.value || 15.4395;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('map').setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', (e) => {
      const position = this.marker!.getLatLng();
      this.profileForm.patchValue({
        latitude: position.lat,
        longitude: position.lng,
      });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker!.setLatLng(e.latlng);
      this.profileForm.patchValue({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    });
  }

  cancelEdit() {
    this.isEditMode = false;
    this.selectedFile = null;
    this.selectedFileName = '';
    if (this.profile) {
      this.profileForm.patchValue({
        bio: this.profile.bio || '',
        city: this.profile.city || '',
        country: this.profile.country || '',
        address: this.profile.address || '',
        latitude: this.profile.latitude,
        longitude: this.profile.longitude,
      });
    }
    this.error = '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
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
    formData.append('bio', formValue.bio || '');
    formData.append('city', formValue.city || '');
    formData.append('country', formValue.country || '');
    formData.append('address', formValue.address || '');

    if (formValue.latitude !== null && formValue.latitude !== '') {
      formData.append('latitude', formValue.latitude.toString());
    }
    if (formValue.longitude !== null && formValue.longitude !== '') {
      formData.append('longitude', formValue.longitude.toString());
    }

    // Add profile picture if selected
    if (this.selectedFile) {
      formData.append('profile_picture', this.selectedFile);
    }

    this.profileService.updateMeWithFormData(formData).subscribe({
      next: (data) => {
        this.profile = data;
        this.isEditMode = false;
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
