"use client";
import {
  MiniKit
} from "./chunk-DKXMTG56.js";

// minikit-provider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { jsx } from "react/jsx-runtime";
var MiniKitContext = createContext({
  isInstalled: void 0
});
var MiniKitProvider = ({
  children,
  props
}) => {
  const [isInstalled, setIsInstalled] = useState(
    void 0
  );
  useEffect(() => {
    const { success } = MiniKit.install(props?.appId);
    if (!success) return setIsInstalled(false);
    MiniKit.commandsAsync.getPermissions().then(({ commandPayload: _, finalPayload }) => {
      if (finalPayload.status === "success") {
        MiniKit.user.permissions = {
          notifications: finalPayload.permissions.notifications,
          contacts: finalPayload.permissions.contacts
        };
      }
    });
    setIsInstalled(success);
  }, [props?.appId]);
  return /* @__PURE__ */ jsx(MiniKitContext.Provider, { value: { isInstalled }, children });
};
var useMiniKit = () => {
  const context = useContext(MiniKitContext);
  if (context === void 0) {
    throw new Error("useMiniKit must be used within a MiniKitProvider");
  }
  return context;
};
export {
  MiniKitProvider,
  useMiniKit
};
