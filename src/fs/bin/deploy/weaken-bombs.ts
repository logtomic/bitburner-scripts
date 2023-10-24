import { NS } from "@ns";

import { getServerFlatMap } from "fs/bin/servers/getServerMap";
import constants from "fs/lib/constants";

export async function main(ns: NS) {
  const FILE_LOCATION = constants.files.bin.weakenBomb;
  const target = ns.args[0] || "n00dles";
  const servers = getServerFlatMap(ns, (s: string) => {
    return {
      maxRam: ns.getServerMaxRam(s),
      usedRam: ns.getServerUsedRam(s),
    };
  });

  servers
    .filter((s) => s.maxRam >= 64)
    .filter((s) => s.usedRam == 0)
    .forEach((runner) => {
      ns.scp(FILE_LOCATION, runner.name, "home");
      const totalThreads = Math.floor(
        runner.maxRam / ns.getScriptRam(FILE_LOCATION)
      );
      ns.exec(FILE_LOCATION, runner.name, totalThreads, target, totalThreads);
    });
}

export function autocomplete(data: any, args: any) {
  return data.servers;
}
