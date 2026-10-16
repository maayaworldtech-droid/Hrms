import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  mustChangePassword: boolean;
  isLoading: boolean;
}

function loadInitialUser(): User | null {
  try {
    const raw = localStorage.getItem('maaya_current_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return {
      id: String(u.id),
      name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
      role: u.role || 'EMPLOYEE',
      designation: u.jobTitle || u.designation || 'Staff',
      department: u.department || 'General',
      employeeId: u.employeeCode || `MW-${u.id}`,
      joiningDate: u.dateOfJoining || u.joiningDate || '2024-01-15',
      phone: u.phone || '+91 98765 43210',
      address: u.address || '',
      status: u.status || 'ACTIVE',
      mustChangePassword: u.mustChangePassword,
    };
  } catch {
    return null;
  }
}

const initialUser = loadInitialUser();

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: !!initialUser,
  activeRole: initialUser?.role || 'EMPLOYEE',
  mustChangePassword: !!initialUser?.mustChangePassword,
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
      state.user = null;
      state.isAuthenticated = false;
      state.activeRole = 'EMPLOYEE';
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
