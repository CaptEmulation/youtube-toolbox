import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IState {
  open: boolean;
  connected: boolean;
  connecting: boolean;
  authenticated: boolean;
  error?: string;
  livechatId?: string | null;
  nextPage?: string | null;
  requestAgainAt?: number | null;
}

export const initialState: IState = {
  open: false,
  connected: false,
  connecting: false,
  authenticated: false,
};

const slice = createSlice({
  name: "socket",
  initialState,
  reducers: {
    open(state) {
      state.open = true;
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
      state.open = false;
      state.connected = false;
      state.connecting = false;
      state.authenticated = false;
      state.error = action.payload;
    },
    disconnected(state) {
      state.open = false;
      state.connected = false;
      state.connecting = false;
    },
    liveChatMessages(
      state,
      action: PayloadAction<{
        livechatId: string;
        nextPage?: string | null;
        requestAgainAt?: number | null;
      }>
    ) {
      state.livechatId = action.payload.livechatId;
      state.nextPage = action.payload.nextPage;
      state.requestAgainAt = action.payload.requestAgainAt;
    },
  },
});

const selectRoot = (state: { socket: IState }) => state.socket;
const selectIsOpen = createSelector(selectRoot, (state) => state.open);
const selectIsConnected = createSelector(
  selectRoot,
  (state) => state.connected
);
const selectIsConnecting = createSelector(
  selectRoot,
  (state) => state.connecting
);
const selectIsAuthenticated = createSelector(
  selectRoot,
  (state) => state.authenticated
);
const selectError = createSelector(selectRoot, (state) => state.error);

export const selectors = {
  isOpen: selectIsOpen,
  isConnected: selectIsConnected,
  isConnecting: selectIsConnecting,
  isAuthenticated: selectIsAuthenticated,
  error: selectError,
};

export const { actions, reducer } = slice;
