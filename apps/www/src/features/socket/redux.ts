import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IState {
  connected: boolean;
  connecting: boolean;
  authenticated: boolean;
  liveChatId?: string;
  error?: string;
}

export const initialState: IState = {
  connected: false,
  connecting: false,
  authenticated: false,
};

const slice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    open(state) {
      state.connected = false;
      state.connecting = true;
    },
    connected(state) {
      state.connected = true;
      state.connecting = false;
      delete state.error;
    },
    authenticated(state) {
      state.authenticated = true;
    },
    anonymous(state) {
      state.authenticated = false;
    },
    error(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    disconnected(state) {
      state.connected = false;
      state.connecting = false;
    },
  },
});

const selectRoot = (state: { socket: IState }) => state.socket;
export const selectIsConnected = createSelector(
  selectRoot,
  (state) => state.connected
);
export const selectIsConnecting = createSelector(
  selectRoot,
  (state) => state.connecting
);
export const selectIsAuthenticated = createSelector(
  selectRoot,
  (state) => state.authenticated
);
export const selectError = createSelector(selectRoot, (state) => state.error);

export const selectors = {
  isConnected: selectIsConnected,
  isConnecting: selectIsConnecting,
  isAuthenticated: selectIsAuthenticated,
  error: selectError,
};

export const { actions, reducer } = slice;
