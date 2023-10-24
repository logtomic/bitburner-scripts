import { NS } from "@ns";

import depthFirstSearch from "fs/bin/servers/depthFirstSearch";

export function unlockServer(ns: NS, server: string) {
  const portHacks = [
    ns.brutessh,
    ns.ftpcrack,
    ns.relaysmtp,
    ns.sqlinject,
    ns.httpworm,
    ns.nuke,
  ];
  if (!server.includes("pserv")) {
    portHacks.forEach((porthack) => {
      try {
        porthack(server);
      } catch {}
    });
  }
}

export default function unlock(ns: NS) {
  depthFirstSearch(ns, null, (server: string) => {
    unlockServer(ns, server);
  });
}

/** @param {NS} ns */
export async function main(ns: NS) {
  unlock(ns);
}
