import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  toasts: ToastMessage[];
  notifications: AppNotification[];
}

const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Payroll Disbursed',
    message: 'September 2026 payroll has been successfully credited via NEFT.',
    type: 'success',
    timestamp: '2 hours ago',
    read: false,
    actionUrl: '/employee/salary',
  },
  {
    id: 'notif-2',
    title: 'Leave Approved',
    message: 'Your Sick Leave for Sep 15 has been approved by Rajesh Kumar.',
    type: 'info',
    timestamp: '1 day ago',
    read: false,
    actionUrl: '/employee/leaves',
  },
  {
    id: 'notif-3',
    title: 'Upcoming National Holiday',
    message: 'Dussehra / Vijayadashami holiday on October 20, 2026.',
    type: 'info',
    timestamp: '3 days ago',
    read: true,
    actionUrl: '/admin/holidays',
  },
];

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  toasts: [],
  notifications: initialNotifications,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      state.toasts.push({ ...action.payload, id });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const n = state.notifications.find((notif) => notif.id === action.payload);
      if (n) n.read = true;
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleMobileMenu,
  setMobileMenuOpen,
  addToast,
  removeToast,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = uiSlice.actions;

export default uiSlice.reducer;
