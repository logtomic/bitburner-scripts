import { NS } from "@ns";

import colored from "fs/lib/util/colored";
import localeHHMMSS from "fs/lib/util/localeHHMMSS";

export default function timePrint(
  ns: NS,
  message: string,
  timeColor: string = "cyan"
) {
  const timeStamp = colored(timeColor, `[${localeHHMMSS()}]`);
  ns.print(`${timeStamp} ${message}`);
}

export function timePrintTerminal(
  ns: NS,
  message: string,
  timeColor: string = "cyan"
) {
  const timeStamp = colored(timeColor, `[${localeHHMMSS()}]`);
  ns.tprint(`${timeStamp} ${message}`);
}
