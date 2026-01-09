import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { UserProfile } from '../../interfaces/user-profile';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);

  profile: UserProfile | null = null;
  loading = true;
  error = '';
  isEditMode = false;
  saving = false;
  selectedFile: File | null = null;
  selectedFileName: string = '';

  profileForm: FormGroup = this.fb.group({
    bio: [''],
    city: [''],
    country: [''],
    address: [''],
    latitude: [null],
    longitude: [null]
  });

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
          longitude: data.longitude
        });
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load profile.';
        this.loading = false;
      }
    });
  }

  enableEditMode() {
    this.isEditMode = true;
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
        longitude: this.profile.longitude
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
      }
    });
  }
}