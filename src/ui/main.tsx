import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { postToPlugin } from "./hooks/usePluginMessage";
import "./styles/global.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Request initial data
postToPlugin({ type: "INIT" });
postToPlugin({ type: "GET_SCHEMAS" });
postToPlugin({ type: "GET_CATEGORIES" });
