import { NS } from "@ns";

import { doc, alert } from "fs/lib/ui/box";

export default function executeCommand(cmd = "") {
  // Acquire a reference to the terminal text field
  const terminalInput: Record<string, any> | null =
    doc.getElementById("terminal-input");

  if (terminalInput == null) {
    alert("Must have terminal open.");
  } else {
    terminalInput.value = cmd;
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: terminalInput });
    terminalInput[handler].onKeyDown({
      key: "Enter",
      preventDefault: () => null,
    });
  }
}

export async function main(ns: NS) {
  executeCommand(ns.args[0] as string);
}
