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
import { openLivechat, toAction } from "./messages";

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
  const isConnected = useAppSelector(socketSelectors.isConnected);
  const isConnecting = useAppSelector(socketSelectors.isConnecting);
  const open = useCallback(() => {
    dispatch(socketActions.open());
  }, [dispatch, websocketUrl]);

  useEffect(() => {
    if (isConnecting) {
      var ws = new WebSocket(
        websocketUrl ??
          (window.location.protocol === "https:" ? "wss://" : "ws://") +
            window.location.host +
            "/ws"
      );
      setWs(ws);
      const onOpen = () => {
        dispatch(socketActions.connected());
      };
      const onMessage = (msg: MessageEvent<any>) => {
        const action = toAction(msg.data);
        switch (action.type) {
          case "connected": {
            dispatch(socketActions.authenticated());
            ws.send(JSON.stringify(openLivechat()));
            break;
          }
        }
      };
      const onClose = () => {
        dispatch(socketActions.disconnected());
      };
      const onError = (err: Event) => {
        dispatch(socketActions.error(err.toString()));
        ws.close();
      };
      ws.addEventListener("open", onOpen);
      ws.addEventListener("message", onMessage);
      ws.addEventListener("close", onClose);
      ws.addEventListener("error", onError);

      return () => {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("message", onMessage);
        ws.removeEventListener("close", onClose);
        ws.removeEventListener("error", onError);
      };
    }
  }, [dispatch, isConnecting]);

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
