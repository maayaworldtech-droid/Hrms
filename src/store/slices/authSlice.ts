import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  mustChangePassword: boolean;
  isLoading: boolean;
}

const defaultAdminUser: User = {
  id: '1',
  name: 'System Admin',
  email: 'admin@themaayaworld.com',
  role: 'ADMIN',
  designation: 'Administrator',
  department: 'Administration',
  employeeId: 'ADM-001',
  joiningDate: '2024-01-01',
  phone: '+91 98765 43210',
  address: 'Corporate Headquarters',
  status: 'ACTIVE',
  mustChangePassword: false,
};

function loadInitialUser(): User {
  try {
    const raw = localStorage.getItem('maaya_current_user');
    if (!raw) return defaultAdminUser;
    const u = JSON.parse(raw);
    return {
      id: String(u.id || '1'),
      name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'System Admin',
      email: u.email || 'admin@themaayaworld.com',
      role: (u.role as UserRole) || 'ADMIN',
      designation: u.jobTitle || u.designation || 'Administrator',
      department: u.department || 'Administration',
      employeeId: u.employeeCode || `ADM-${u.id || '001'}`,
      joiningDate: u.dateOfJoining || u.joiningDate || '2024-01-01',
      phone: u.phone || '+91 98765 43210',
      address: u.address || '',
      status: u.status || 'ACTIVE',
      mustChangePassword: false,
    };
  } catch {
    return defaultAdminUser;
  }
}

const initialUser = loadInitialUser();

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: true,
  activeRole: initialUser.role || 'ADMIN',
  mustChangePassword: false,
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      if (action.payload) {
        state.activeRole = action.payload.role;
        state.mustChangePassword = !!action.payload.mustChangePassword;
      } else {
        state.mustChangePassword = false;
      }
    },
    setPasswordChanged: (state) => {
      state.mustChangePassword = false;
      if (state.user) {
        state.user.mustChangePassword = false;
        try {
          const raw = localStorage.getItem('maaya_current_user');
          if (raw) {
            const u = JSON.parse(raw);
            u.mustChangePassword = false;
            localStorage.setItem('maaya_current_user', JSON.stringify(u));
          }
        } catch {
          // ignore
        }
      }
    },
    logout: (state) => {
      localStorage.removeItem('maaya_current_user');
      localStorage.removeItem('maaya_token');
      state.user = defaultAdminUser;
      state.isAuthenticated = true;
      state.activeRole = 'ADMIN';
      state.mustChangePassword = false;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setUser, setPasswordChanged, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
