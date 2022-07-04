import { createSelector, createSlice } from "@reduxjs/toolkit";

interface IState {
  websocketUrl?: string;
}
const initialState: IState = {
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
};
const slice = createSlice({
  name: "config",
  initialState,
  reducers: {},
});

const root = (state: any): IState => state.config;
const selectWebsocketUrl = createSelector(root, (state) => state.websocketUrl);
export const selectors = {
  websocketUrl: selectWebsocketUrl,
};
export const { reducer } = slice;
