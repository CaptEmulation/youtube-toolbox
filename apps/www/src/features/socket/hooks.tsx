import {
  FC,
  useState,
  useEffect,
  useContext,
  PropsWithChildren,
  createContext,
  useCallback,
  Context,
} from "react";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectors as configSelectors } from "features/config/redux";
import {
  actions as socketActions,
  selectors as socketSelectors,
} from "./redux";
import { moreMessages, openLivechat, toAction } from "./messages";

interface IContext {
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  error?: string;
  open: () => void;
}

function useSocketProvider() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const dispatch = useAppDispatch();
  const websocketUrl = useAppSelector(configSelectors.websocketUrl);
  const isOpen = useAppSelector(socketSelectors.isOpen);
  const isConnected = useAppSelector(socketSelectors.isConnected);
  const isConnecting = useAppSelector(socketSelectors.isConnecting);
  const open = useCallback(() => {
    dispatch(socketActions.open());
  }, [dispatch, websocketUrl]);

  useEffect(() => {
    if (isOpen) {
      console.log("Connecting to websocket...");
      var socket = new WebSocket(
        websocketUrl ??
          (window.location.protocol === "https:" ? "wss://" : "ws://") +
            window.location.host +
            "/ws"
      );
      setWs(socket);
      const onOpen = () => {
        dispatch(socketActions.connected());
      };
      const onMessage = (msg: MessageEvent<any>) => {
        console.log("message", msg.data);
        const action = toAction(msg.data);
        switch (action.type) {
          case "connected": {
            dispatch(socketActions.authenticated());
            socket.send(JSON.stringify(openLivechat()));
            break;
          }
          case "livechatNewMessages": {
            console.log(action.payload);
            break;
          }
        }
      };
      const onClose = () => {
        dispatch(socketActions.disconnected());
      };
      const onError = (err: Event) => {
        dispatch(socketActions.error((err as any).code.toString()));
        socket.close();
      };
      socket.addEventListener("open", onOpen);
      socket.addEventListener("message", onMessage);
      socket.addEventListener("close", onClose);
      socket.addEventListener("error", onError);

      return () => {
        console.log("cleaning up");
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("message", onMessage);
        socket.removeEventListener("close", onClose);
        socket.removeEventListener("error", onError);
      };
    }
  }, [dispatch, isOpen]);

  return {
    isConnected,
    isConnecting,
    isAuthenticated: useAppSelector(socketSelectors.isAuthenticated),
    error: useAppSelector(socketSelectors.error),
    open,
  };
}

let SocketContext: Context<IContext> | null = null;

export const SocketProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const context = useSocketProvider();
  if (!SocketContext) {
    SocketContext = createContext<IContext>(context);
  }

  return (
    <SocketContext.Provider value={context}>{children}</SocketContext.Provider>
  );
};

export function useSocket() {
  if (!SocketContext) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return useContext(SocketContext);
}
