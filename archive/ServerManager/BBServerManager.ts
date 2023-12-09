import { NS, Player } from "@ns";
import {
  BBServer,
  HomeServer,
  PlayerServer,
  TargetServer,
  TaskServer,
} from "fs/home/admin/ServerManager/BBServer";
import { getServerFlatMap } from "fs/bin/servers/getServerMap";

export default class BBServerManager {
  ns: NS;
  player: Player;
  homeServer: HomeServer;
  playerServers: Record<string, PlayerServer>;
  targetServers: Record<string, TargetServer>;
  taskServers: Record<string, TaskServer>;

  constructor(ns: NS) {
    this.ns = ns;
    this.player = ns.getPlayer();
    this.homeServer = new HomeServer(ns);
    this.playerServers = ns.getPurchasedServers().reduce((coll, server) => {
      coll[server] = new PlayerServer(ns, server);
      return coll;
    }, {} as Record<string, PlayerServer>);
    this.targetServers = getServerFlatMap(ns)
      .filter((server) => {
        return (
          server.name !== "home" &&
          server.name !== "darkweb" &&
          ns.getServerMaxMoney(server.name) > 0 &&
          Object.keys(this.playerServers).indexOf(server.name) === -1
        );
      })
      .reduce((coll, server) => {
        coll[server.name] = new TargetServer(ns, server.name);
        return coll;
      }, {} as Record<string, TargetServer>);
    this.taskServers = getServerFlatMap(ns)
      .filter((server) => {
        return server.name !== "home" && ns.getServerMaxRam(server.name) >= 4;
      })
      .reduce((coll, server) => {
        coll[server.name] = new TaskServer(ns, server.name);
        return coll;
      }, {} as Record<string, TaskServer>);
  }

  refresh() {
    this.player = this.ns.getPlayer();
    this.homeServer.refresh();
    Object.values(this.playerServers).forEach((server) => server.refresh());
    Object.values(this.targetServers).forEach((server) => server.refresh());
    Object.values(this.taskServers).forEach((server) => server.refresh());
  }

  getServer(server: string): BBServer | null {
    if (server in this.playerServers) {
      return this.playerServers[server];
    } else if (server in this.targetServers) {
      return this.targetServers[server];
    } else if (server in this.homeServer) {
      return this.homeServer;
    } else if (server in this.taskServers) {
      return this.taskServers[server];
    } else {
      return null;
    }
  }
}

export async function main(ns: NS) {
  ns.disableLog("ALL");
  const sm = new BBServerManager(ns);
}
