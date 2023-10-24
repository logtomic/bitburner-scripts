import { NS } from "@ns";

import { getServerFlatMap } from "fs/bin/servers/getServerMap";
import { convertMSToHHMMSS, timePrint } from "fs/lib/util/index";

function runWeaken(ns: NS, target: Record<string, any>, host = "home") {
  const scriptCost = ns.getScriptRam("fs/bin/weaken.js");
  const availableRam =
    (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) *
    (host == "home" ? 0.5 : 1);
  const threads = Math.max(0, Math.floor(availableRam / scriptCost));
  if (threads > 0) {
    ns.exec("fs/bin/weaken.js", host, threads, target.name, threads);
  }
  return threads;
}

async function _swarmWeaken(
  ns: NS,
  useableServers: Array<Record<string, any>>,
  targets: Array<Record<string, any>>,
  useHome = false,
  waitTimeMax = -1
) {
  const weakenedServers = [];
  const weakenReduction = ns.weakenAnalyze(1);
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const waitTime = ns.getWeakenTime(target.name);
    if (waitTimeMax > 0 && waitTimeMax * 1000 < waitTime) {
      timePrint(
        ns,
        `Skipping '${target.name}' due to wait time max of ${waitTimeMax} seconds...`
      );
      continue;
    }

    if (target.sec == target.minSec) {
      timePrint(ns, `Skipping '${target.name}' due to min security...`);
    } else if (!target.hasAccess) {
      timePrint(ns, `Skipping '${target.name}' due to no root access...`);
    } else {
      while (ns.getServerSecurityLevel(target.name) > target.minSec) {
        timePrint(ns, `Weakening '${target.name}'...`);
        const sec = ns.getServerSecurityLevel(target.name);
        let threads = 0;
        useableServers.forEach((server: Record<string, any>) => {
          threads += runWeaken(ns, target, server.name);
        });
        if (useHome) threads += runWeaken(ns, target, "home");
        timePrint(
          ns,
          `+${(sec - target.minSec).toFixed(3)} => +${Math.max(
            0,
            sec - target.minSec - weakenReduction * threads
          ).toFixed(3)} (${convertMSToHHMMSS(waitTime)})`
        );
        await ns.sleep(waitTime + 2000);
      }
      weakenedServers.push(target.name);
    }
    await ns.sleep(100);
  }
  return weakenedServers;
}

export default async function swarmWeaken(
  ns: NS,
  maxDuration = -1,
  useHome = false
) {
  ns.disableLog("ALL");
  ns.clearLog();
  let serverMap = getServerFlatMap(ns, (server: string) => {
    return {
      name: server,
      hackLevel: ns.getServerRequiredHackingLevel(server),
      sec: ns.getServerSecurityLevel(server),
      minSec: ns.getServerMinSecurityLevel(server),
      hasAccess: ns.hasRootAccess(server),
      maxRam: ns.getServerMaxRam(server),
    };
  });
  let useableServers = serverMap.filter(
    (server: Record<string, any>) => server.hasAccess && server.maxRam > 0
  );
  useableServers.forEach((server: Record<string, any>) => {
    ns.scp("fs/bin/weaken.js", server.name, "home");
  });
  const targets = [...serverMap]
    .filter((t) => !t.name.includes("pserv"))
    .sort((a, b) => a.minSec + a.hackLevel - (b.minSec + b.hackLevel));

  const weakenedServers = await _swarmWeaken(
    ns,
    useableServers,
    targets,
    useHome,
    maxDuration
  );

  return weakenedServers;
}

/** @param {NS} ns */
export async function main(ns: NS) {
  ns.tail();
  const flags = ns.flags([
    ["h", false], // whether to include home in swarm
    // ["t", false], // whether to tail this in another window
    ["d", -1], // limit to weaken duration in seconds. -1 for no limit
  ]);

  await swarmWeaken(ns, flags["d"] as number, flags["h"] as boolean);
}
