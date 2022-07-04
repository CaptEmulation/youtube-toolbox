import "../styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SocketProvider } from "features/socket/hooks";
import { Provider as StoreProvider } from "react-redux";
import { store } from "app/store";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <StoreProvider store={store}>
      <SessionProvider session={session}>
        <SocketProvider>
          <Component {...pageProps} />
        </SocketProvider>
      </SessionProvider>
    </StoreProvider>
  );
}
