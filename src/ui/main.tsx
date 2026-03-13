import { render } from "@create-figma-plugin/ui";
import { h } from "preact";
import { App } from "./App";

function Plugin() {
  return <App />;
}

export default render(Plugin);
