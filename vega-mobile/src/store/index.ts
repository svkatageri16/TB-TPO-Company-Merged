import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, StudentDashboardData } from "../types";

// 1. Auth Slice definitions
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  biometricsEnabled: boolean;
  rememberMe: boolean;
  status: "idle" | "loading" | "failed";
}

const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  biometricsEnabled: false,
  rememberMe: false,
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialAuthState,
  reducers: {
    setAuthCredentials(state, action: PayloadAction<{ user: User; rememberMe: boolean }>) {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.rememberMe = action.payload.rememberMe;
    },
    enableBiometrics(state, action: PayloadAction<boolean>) {
      state.biometricsEnabled = action.payload;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

// 2. Student Core Dashboard Slice
interface StudentState {
  dashboardData: StudentDashboardData | null;
  isLoading: boolean;
  error: string | null;
}

const initialStudentState: StudentState = {
  dashboardData: null,
  isLoading: false,
  error: null,
};

const studentSlice = createSlice({
  name: "student",
  initialState: initialStudentState,
  reducers: {
    fetchDashboardStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    fetchDashboardSuccess(state, action: PayloadAction<StudentDashboardData>) {
      state.dashboardData = action.payload;
      state.isLoading = false;
    },
    fetchDashboardFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    incrementXPAward(state, action: PayloadAction<number>) {
      if (state.dashboardData) {
        state.dashboardData.xpBalance += action.payload;
      }
    },
  },
});

// 3. App Configs Slice (Language and Network States)
interface ConfigState {
  language: "en" | "mr";
  isOffline: boolean;
}

const initialConfigState: ConfigState = {
  language: "en",
  isOffline: false,
};

const configSlice = createSlice({
  name: "config",
  initialState: initialConfigState,
  reducers: {
    toggleLanguage(state) {
      state.language = state.language === "en" ? "mr" : "en";
    },
    setLanguage(state, action: PayloadAction<"en" | "mr">) {
      state.language = action.payload;
    },
    setNetworkStatus(state, action: PayloadAction<boolean>) {
      // payload represents if device is offline (true/false)
      state.isOffline = action.payload;
    },
  },
});

// Expose Action Creators
export const { setAuthCredentials, enableBiometrics, logout } = authSlice.actions;
export const { fetchDashboardStart, fetchDashboardSuccess, fetchDashboardFailure, incrementXPAward } = studentSlice.actions;
export const { toggleLanguage, setLanguage, setNetworkStatus } = configSlice.actions;

// Build the Core State Hub
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    student: studentSlice.reducer,
    config: configSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
