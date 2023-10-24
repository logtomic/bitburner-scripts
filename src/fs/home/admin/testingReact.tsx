import { NS } from "@ns";
import React, { ReactDOM } from "lib/react";
import { createBox, doc } from "fs/lib/ui/box";
import Dashboard from "fs/lib/ui/components/Dashboard";

export async function main(ns: NS) {
  ns.disableLog("asleep");
  const box = createBox(
    "Test React Box",
    "Content",
    "\uea74",
    "test-box-react-root"
  ) as HTMLElement;
  box.style.height = "50%";
  box.style.width = "50%";
  const boxElement = doc.getElementsByClassName(
    "test-box-react-root"
  )[0] as HTMLElement;
  const boxBody = boxElement.lastElementChild as HTMLElement;
  ReactDOM.render(
    <React.StrictMode>
      <Dashboard ns={ns} />
    </React.StrictMode>,
    boxBody
  );
  while (ns.scriptRunning("/home/admin/testingReact.js", "home")) {
    await ns.asleep(1000); // script must be running in bitburner for ns methods to function inside our component
  }
}
