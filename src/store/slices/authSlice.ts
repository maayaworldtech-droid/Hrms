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
    const token = localStorage.getItem('maaya_token');
    if (!raw || !token || !token.includes('.')) {
      if (raw && (!token || !token.includes('.'))) {
        localStorage.removeItem('maaya_current_user');
        localStorage.removeItem('maaya_token');
      }
      return null;
    }
    const u = JSON.parse(raw);
    return {
      id: String(u.id || '1'),
      name: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'User',
      email: u.email || '',
      role: (u.role as UserRole) || 'EMPLOYEE',
      designation: u.jobTitle || u.designation || 'Staff',
      department: u.department || '',
      employeeId: u.employeeCode || `MW-${u.id || '001'}`,
      joiningDate: u.dateOfJoining || u.joiningDate || '',
      phone: u.phone || '',
      address: u.address || '',
      status: u.status || 'ACTIVE',
      mustChangePassword: !!u.mustChangePassword,
      location: u.location || u.locationName || '',
      shift: u.shift === 'EVENING' ? 'EVENING' : 'MORNING',
      enrolledFacePhoto: u.enrolledFacePhoto,
      enrolledFaceBiometrics: u.enrolledFaceBiometrics,
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
  mustChangePassword: initialUser?.mustChangePassword || false,
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
        state.activeRole = 'EMPLOYEE';
      }
    },
    setActiveRole: (state, action: PayloadAction<UserRole>) => {
      state.activeRole = action.payload;
      if (state.user) {
        state.user.role = action.payload;
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
        if (action.payload.role) {
          state.activeRole = action.payload.role;
        }
        try {
          const raw = localStorage.getItem('maaya_current_user');
          if (raw) {
            const u = JSON.parse(raw);
            localStorage.setItem('maaya_current_user', JSON.stringify({ ...u, ...action.payload }));
          }
        } catch {
          // ignore
        }
      }
    },
  },
});

export const { setUser, setActiveRole, setPasswordChanged, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
