import { NS } from "@ns";

export async function main(ns: NS) {
  const flags = ns.flags([]);
  const flagArray = flags._ as string[];
  const server: string = flagArray.length ? flagArray[0] : "n00dles";

  ns.tail();
  ns.disableLog("ALL");

  while (true) {
    let money = ns.getServerMoneyAvailable(server);
    if (money === 0) money = 1;
    const maxMoney = ns.getServerMaxMoney(server);
    const minSec = ns.getServerMinSecurityLevel(server);
    const sec = ns.getServerSecurityLevel(server);
    ns.clearLog();

    let lines: string[] = [];

    const status = [
      `${server}:`,
      ` $_______: $${ns.formatNumber(money, 3)} / $${ns.formatNumber(
        maxMoney,
        3
      )} (${((money / maxMoney) * 100).toFixed(2)}%)`,
      ` security: +${(sec - minSec).toFixed(3)}`,
      " ",
    ];

    const oneWT = Math.ceil((sec - minSec) * 20);
    const stageOne = [
      "=== Stage 1 ===",
      "Weaken to min security",
      `  weaken__: t=${oneWT}`,
      " ",
    ];
    const twoGT = Math.ceil(ns.growthAnalyze(server, maxMoney / money));
    const twoWT = Math.ceil(twoGT * 0.004);
    const stageTwo = [
      "=== Stage 2 ===",
      "Grow to max money",
      `  grow____: t=${twoGT}`,
      `  weaken__: t=${twoWT}`,
      `  total___: t=${twoGT + twoWT}`,
      " ",
    ];
    const finHT = Math.max(
      1,
      Math.floor(ns.hackAnalyzeThreads(server, money - maxMoney / 2))
    );
    let finGT;
    if (finHT == 1) {
      finGT = Math.ceil(ns.growthAnalyze(server, 1 / ns.hackAnalyze(server)));
    } else {
      finGT = Math.ceil(ns.growthAnalyze(server, 2));
    }
    const finWT = Math.ceil((finGT * 0.004 + finHT * 0.002) * 20);
    const stageThree = [
      "=== Stage 3 ===",
      "Hack for half and reset",
      `  hack____: t=${finHT}`,
      `  grow____: t=${finGT}`,
      `  weaken__: t=${finWT}`,
      " ",
    ];

    lines = lines
      .concat(status)
      .concat(stageOne)
      .concat(stageTwo)
      .concat(stageThree);
    lines.forEach((line) => {
      ns.print(line);
    });
    await ns.sleep(1000);
  }
}

export function autocomplete(data: any, args: any) {
  return data.servers;
}
