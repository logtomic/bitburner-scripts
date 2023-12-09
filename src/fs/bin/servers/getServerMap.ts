import { NS } from "@ns";

import depthFirstSearch from "fs/bin/servers/depthFirstSearch";
import { unlockServer } from "fs/bin/servers/unlock";

// class Server {
//   name: string;
//   sec: number;
//   minSec: number;
//   hackLevel: number;
//   hasAccess: boolean;
//   maxRam: number;
//   children: Record<string, Server>;
//   constructor(ns: NS, name: string) {
//     this.name = name;
//     this.sec = ns.getServerSecurityLevel(name);
//     this.minSec = ns.getServerMinSecurityLevel(name);
//     this.hackLevel = ns.getServerRequiredHackingLevel(name);
//     this.hasAccess = ns.hasRootAccess(name);
//     this.maxRam = ns.getServerMaxRam(name);
//     this.children = {};
//   }
// }

export function getServerFlatMap(
  ns: NS,
  infoFunc: Function = (server: string) => {
    return {};
  }
) {
  const flatMap: Array<Record<string, any>> = [];
  depthFirstSearch(
    ns,
    () => {},
    (server: string) => {
      unlockServer(ns, server);
      flatMap.push({ name: server, ...infoFunc(server) });
    }
  );
  return flatMap;
}

export default function getServerMap(
  ns: NS,
  infoFunc: Function = (server: string) => {
    return {};
  }
) {
  const serverDump: Record<string, any> = {};
  const addToServerDump = (child: string, parent: string) => {
    if (parent in serverDump) {
      serverDump[parent].push(child);
    } else {
      serverDump[parent] = [child];
    }
  };

  depthFirstSearch(ns, addToServerDump, (server: string) =>
    unlockServer(ns, server)
  );

  const recurse = (server: string) => {
    const output = { name: server, ...infoFunc(server), children: {} };

    if (server in serverDump) {
      serverDump[server].forEach((child: string) => {
        output["children"][child] = recurse(child);
      });
    }

    return output;
  };

  return recurse("home")["children"];
}

export function getServerObjectsMap(ns: NS) {}
