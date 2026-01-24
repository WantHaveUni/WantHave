import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MyListingsComponent } from './components/my-listings/my-listings.component';
import { MyTransactionsComponent } from './components/my-transactions/my-transactions.component';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { CreateListingComponent } from './components/create-listing/create-listing.component';
import { CheckoutSuccessComponent } from './components/checkout-success/checkout-success.component';
import { CheckoutCancelComponent } from './components/checkout-cancel/checkout-cancel.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'products', component: ProductListComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: 'map', loadComponent: () => import('./components/map-view/map-view.component').then(m => m.MapViewComponent) },
  { path: 'login', component: LoginComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'my-listings', component: MyListingsComponent, canActivate: [authGuard] },
  { path: 'my-transactions', component: MyTransactionsComponent, canActivate: [authGuard] },
  { path: 'watchlist', component: WatchlistComponent, canActivate: [authGuard] },
  { path: 'chat', loadComponent: () => import('./components/chat/chat.component').then(m => m.ChatComponent), canActivate: [authGuard] },
  { path: 'create-listing', component: CreateListingComponent, canActivate: [authGuard] },
  { path: 'checkout/success', component: CheckoutSuccessComponent, canActivate: [authGuard] },
  { path: 'checkout/cancel', component: CheckoutCancelComponent },
  { path: 'admin', loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/products' },
];
