import { Component, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';

@Component({
    selector: 'app-my-transactions',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './my-transactions.component.html',
    styleUrls: ['./my-transactions.component.scss'],
})
export class MyTransactionsComponent implements OnInit {
    @Output() goBack = new EventEmitter<void>();
    private profileService = inject(ProfileService);

    transactions: any[] = [];
    loading = true;
    error = '';

    ngOnInit() {
        this.loadTransactions();
    }

    loadTransactions() {
        this.profileService.getPurchases().subscribe({
            next: (data) => {
                this.transactions = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load transactions.';
                this.loading = false;
            },
        });
    }
}
