export interface AuthResponse {
  token: string;
  username: string;
  expiresIn: number;
  fullName: string;
  email: string;
}

export interface SearchParams {
  from: string;
  to: string;
  date: string;
  passengers: number;
}

export interface BusTrip {
  id: number;
  operatorName: string;
  busName: string;
  busType: string;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: number;
  rating: number;
  amenities?: string;
}

export interface Seat {
  id: number;
  seatNumber: string;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | string;
}

export interface Reservation {
  reservationId: number;
  seatId: number;
  seatNumber: string;
  status: string;
  expiresAt?: string;
  tripId: number;
  operatorName: string;
  busName: string;
  busType: string;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  fare: number;
  passengerName: string;
  contactPhone: string;
  bookingReference: string;
  createdAt: string;
  holdSecondsRemaining: number;
  departed: boolean;
  canCancel: boolean;
  _receivedAt?: number;
}

export interface Profile {
  id?: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  walletBalance?: number;
  createdAt?: string;
  token?: string;
  expiresIn?: number;
}

export interface WalletInfo {
  balance: number;
  topUpEnabled: boolean;
  minTopUp: number;
  maxTopUp: number;
  dailyTopUpRemaining: number;
}

export interface WalletTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | string;
  createdAt: string;
}

export interface Ticket {
  pnr: string;
  operatorName: string;
  busName: string;
  busType: string;
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  seatNumber: string;
  passengerName: string;
  totalFare: number;
  paymentMethod: string;
  transactionReference: string;
}

export interface ApiFailure extends Error {
  status?: number;
  data?: unknown;
}
