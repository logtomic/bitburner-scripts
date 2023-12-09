import { NS } from "@ns";
import BBServer, { TargetServer } from "fs/lib/servers/BBServer";
import Singleton from "fs/lib/servers/Singleton";
import { getServerFlatMap } from "fs/bin/servers/getServerMap";

export default class BBServerManager extends Singleton {
  ns: NS;
  servers: Record<string, TargetServer>;
  port: number;
  pingInterval: number = 10 * 1000;
  history: {
    unlock: {
      playerLevelLastChecked: number;
      portHacksLastAvailable: number;
      allUnlocked: boolean;
    };
  } = {
    unlock: {
      playerLevelLastChecked: 0,
      portHacksLastAvailable: 0,
      allUnlocked: false,
    },
  };
  config: {
    checkUnlockEveryNLevels: number;
  } = {
    checkUnlockEveryNLevels: 50,
  };

  constructor(ns: NS, port: number = 1) {
    super(ns);
    this.ns = ns;
    this.port = port;
    this.servers = getServerFlatMap(ns).reduce((coll, server) => {
      coll[server.name] = new TargetServer(ns, server.name);
      return coll;
    }, {});
    this.servers["home"] = new TargetServer(ns, "home");
  }

  getAllUnlockedServers() {
    this.unlockAll();
    return Object.values(this.servers).filter((server) => {
      return this.ns.hasRootAccess(server.name) || server.name === "home";
    });
  }

  unlockAll() {
    Object.values(this.servers)
      .filter((server) => server.status === "LOCKED")
      .forEach((server) => server.unlockSelf());
  }

  getPortHacksAvailable() {
    const files = [
      "BruteSSH.exe",
      "FTPCrack.exe",
      "relaySMTP.exe",
      "HTTPWorm.exe",
      "SQLInject.exe",
    ];
    return files.reduce((coll, file) => {
      coll += this.ns.fileExists(file) ? 1 : 0;
      return coll;
    }, 0);
  }

  unlockPing() {
    const level = this.ns.getHackingLevel();
    const portHacks = this.getPortHacksAvailable();
    const hackingLevelGrew = level > this.history.unlock.playerLevelLastChecked;
    const totalPortHacksObtained =
      portHacks - this.history.unlock.portHacksLastAvailable;
    if (hackingLevelGrew || totalPortHacksObtained > 0) {
      this.unlockAll();
      this.history.unlock.playerLevelLastChecked = level;
      this.history.unlock.portHacksLastAvailable = portHacks;
    }
  }
}

export async function main(ns: NS) {
  ns.disableLog("ALL");
  const sm = new BBServerManager(ns);

  // Todo: Once a ui is implemented, kill this script when it is removed
  // Similarly, if this script is killed, kill the ui element

  while (true) {
    sm.unlockPing();
    console.debug("ping");
    await ns.sleep(sm.pingInterval);
  }
}
