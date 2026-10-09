import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserRole } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  isLoading: boolean;
}

const initialUser = api.auth.getCurrentUser();

const initialState: AuthState = {
  user: initialUser,
  isAuthenticated: !!initialUser,
  activeRole: initialUser?.role || 'ADMIN',
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
      }
    },
    switchRole: (state, action: PayloadAction<UserRole>) => {
      state.activeRole = action.payload;
      const updatedUser = api.auth.switchRole(action.payload);
      state.user = updatedUser;
    },
    logout: (state) => {
      api.auth.logout();
      state.user = null;
      state.isAuthenticated = false;
      state.activeRole = 'EMPLOYEE';
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setUser, switchRole, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
