import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { reducer as socketReducer } from "features/socket/redux";
import { reducer as configReducer } from "features/config/redux";

export const store = configureStore({
  reducer: {
    config: configReducer,
    socket: socketReducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>(); // Export a hook that can be reused to resolve types
export const useAppSelector = <T>(selector: (state: RootState) => T) => {
  return useSelector<RootState, T>(selector);
};
