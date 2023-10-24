import { NS } from "@ns";

import { convertMSToHHMMSS } from "fs/lib/util/index";

export async function main(ns: NS) {
  const flags = ns.flags([
    ["refreshrate", 1000],
    ["help", false],
  ]);
  const flagArray = flags._ as string[];
  if (flagArray.length === 0 || flags.help) {
    ns.tprint(
      "This script helps visualize the money and security of a server."
    );
    ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME`);
    ns.tprint("Example:");
    ns.tprint(`> run ${ns.getScriptName()} n00dles`);
    return;
  }
  ns.tail();
  ns.disableLog("ALL");
  const weakenReduction = ns.weakenAnalyze(1);

  while (true) {
    const server = flagArray[0];
    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    const sec = ns.getServerSecurityLevel(server);
    const chance = ns.hackAnalyzeChance(server);
    ns.clearLog();
    ns.print(`${server}:`);
    ns.print(
      ` $_______: ${ns.nFormat(money, "$0.000a")} / ${ns.nFormat(
        maxMoney,
        "$0.000a"
      )} (${((money / maxMoney) * 100).toFixed(2)}%)`
    );
    ns.print(` security: +${(sec - minSec).toFixed(3)}`);
    ns.print(` chance__: ${(chance * 100).toFixed(2)}%`);
    ns.print("");
    ns.print("Times:");
    ns.print(` hack____: ${convertMSToHHMMSS(ns.getHackTime(server))}`);
    ns.print(` grow____: ${convertMSToHHMMSS(ns.getGrowTime(server))}`);
    ns.print(` weaken__: ${convertMSToHHMMSS(ns.getWeakenTime(server))}`);
    ns.print("");
    ns.print("Stage 1: Weaken to min:");
    ns.print(` weaken__: t=${Math.ceil((sec - minSec) / weakenReduction)}`);
    ns.print("");
    ns.print("Stage 2: Grow to max:");
    let gThreads = Math.ceil(ns.growthAnalyze(server, maxMoney / money));
    ns.print(` grow____: t=${gThreads}`);
    ns.print(
      ` weaken__: t=${Math.ceil(
        (sec - minSec + gThreads * 0.004) / weakenReduction
      )}`
    );
    ns.print("");
    ns.print("Stage 3: Full hack loop:");
    gThreads = Math.ceil(ns.growthAnalyze(server, 2));
    ns.print(
      ` hack____: t=${Math.ceil(
        ns.hackAnalyzeThreads(server, money - maxMoney / 2)
      )}`
    );
    ns.print(` grow____: t=${gThreads}`);
    ns.print(
      ` weaken__: t=${Math.ceil(
        (sec - minSec + gThreads * 0.004) / weakenReduction
      )}`
    );
    await ns.sleep(flags.refreshrate as number);
  }
}

export function autocomplete(data: any, args: any) {
  return data.servers;
}
