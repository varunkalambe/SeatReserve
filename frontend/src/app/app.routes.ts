import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth.component';
import { ShellComponent } from './pages/shell.component';
import { HomeComponent } from './pages/home.component';
import { SearchComponent } from './pages/search.component';
import { SeatsComponent } from './pages/seats.component';
import { PaymentComponent } from './pages/payment.component';
import { BookingsComponent } from './pages/bookings.component';
import { WalletComponent } from './pages/wallet.component';
import { ProfileComponent } from './pages/profile.component';
import { SupportComponent } from './pages/support.component';
import { authGuard, guestGuard, paymentFlowGuard, tripFlowGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent, canActivate: [guestGuard] },
  {
    path: '', component: ShellComponent, canActivate: [authGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent, data: { title: 'Home' } },
      { path: 'search', component: SearchComponent, data: { title: 'Search Buses' } },
      { path: 'seats', component: SeatsComponent, canActivate: [tripFlowGuard], data: { title: 'Select Seats' } },
      { path: 'payment', component: PaymentComponent, canActivate: [paymentFlowGuard], data: { title: 'Payment' } },
      { path: 'bookings', component: BookingsComponent, data: { title: 'My Bookings' } },
      { path: 'wallet', component: WalletComponent, data: { title: 'Wallet' } },
      { path: 'profile', component: ProfileComponent, data: { title: 'Profile' } },
      { path: 'support', component: SupportComponent, data: { title: 'Support' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
