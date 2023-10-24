import { NS } from "@ns";
import BBServerManager from "fs/home/admin/BBServerManager";
import BBServer, { PlayerServer } from "fs/lib/servers/BBServer";
import Sweep from "fs/lib/swarm/Sweep";

export async function main(ns: NS) {
  ns.disableLog("ALL");
  ns.tail();
  //   const serverManager = new BBServerManager(ns);
  //   const servers = serverManager.getAllUnlockedServers();
  //   const sweep = new Sweep(
  //     ns,
  //     // [
  //     //   ...Object.values(servers).filter((s) => {
  //     //     return s.name !== "home";
  //     //   }),
  //     // ],
  //     [...Object.values(servers)],
  //     300
  //   );
  //   await sweep.start();
  //

  // Server object should not contain any server
  const pserver = new PlayerServer(ns, "pserv-1");
  ns.tprint(PlayerServer.maxAffordableRam(ns));
  // Purchase a new server
  // 1. See what level I can afford
  // 2. Purchase the server
}
