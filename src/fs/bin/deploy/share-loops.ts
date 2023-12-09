import { NS } from "@ns";

import { getServerFlatMap } from "fs/bin/servers/getServerMap";
import constants from "fs/lib/constants";

export async function main(ns: NS) {
  const FILE_LOCATION = constants.files.bin.shareLoop;
  const servers = getServerFlatMap(ns, (s: string) => {
    return {
      maxRam: ns.getServerMaxRam(s),
      usedRam: ns.getServerUsedRam(s),
    };
  });

  console.log(servers);

  servers
    .filter((s) => s.maxRam >= 1024)
    .filter((s) => s.usedRam == 0)
    .forEach((runner) => {
      ns.scp(FILE_LOCATION, runner.name, "home");
      const totalThreads = Math.floor(
        runner.maxRam / ns.getScriptRam(FILE_LOCATION)
      );
      ns.exec(FILE_LOCATION, runner.name, totalThreads);
    });
}
