import type { NextPage } from "next";
import Head from "next/head";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "../styles/Home.module.css";
import { FC, useEffect } from "react";
import { useSocket } from "features/socket/hooks";

const LoginButton: FC = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <>
        Signed in as {session.user?.email} <br />
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn()}>Sign in</button>
    </>
  );
};

const ConnectButton: FC = () => {
  const { isConnected, isConnecting, isAuthenticated, error, open } =
    useSocket();
  return (
    <>
      {isConnected ? "Connected" : "Not connected"}
      {isConnecting ? (
        <>
          <br />
          Connecting
        </>
      ) : (
        ""
      )}
      {isAuthenticated ? (
        <>
          {" "}
          <br />
          Authenticated
        </>
      ) : (
        ""
      )}
      {error ? (
        <>
          <br />
          {"Error: " + error}
        </>
      ) : (
        ""
      )}
      <br />
      {!isConnected ? <button onClick={open}>Connect</button> : ""}
    </>
  );
};

const Home: NextPage = () => {
  const { data: session } = useSession();
  useEffect(() => {
    if (session) {
      fetch("/api/youtube/list-broadcasts").then(async (response) => {
        const data = await response.json();
        console.log(data);
      });
    }
  }, [session]);
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <LoginButton />
        <ConnectButton />
      </main>
    </div>
  );
};

export default Home;
