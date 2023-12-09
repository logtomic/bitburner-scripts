import { NS, Server } from "@ns";

import { getServerFlatMap } from "fs/bin/servers/getServerMap";
import Table from "fs/lib/ui/betterTable";
// import slp from "lib/util/index";

class BBServer {
  name: string;
  minSec: number;
  hackLevel: number;
  maxRam: number;
  maxMoney: number;
  portsRequired: number;
  mock: Server;

  constructor(ns: NS, name: string) {
    this.name = name;
    this.minSec = ns.getServerMinSecurityLevel(name);
    this.hackLevel = ns.getServerRequiredHackingLevel(name);
    this.portsRequired = ns.getServerNumPortsRequired(name);
    this.maxMoney = ns.getServerMaxMoney(name);
    this.maxRam = ns.getServerMaxRam(name);
    this.mock = ns.formulas.mockServer();
    this.mock.minDifficulty = this.minSec;
    this.mock.baseDifficulty = this.minSec;
    this.mock.moneyMax = this.maxMoney;
    this.mock.moneyAvailable = this.maxMoney;
    this.mock.hackDifficulty = this.minSec;
    this.mock.requiredHackingSkill = this.hackLevel;
    this.mock.hasAdminRights = true;
    // console.log(this.mock);
  }

  getBaseInfo(ns: NS) {
    return {
      name: this.name,
      hasAccess: ns.hasRootAccess(this.name),
    };
  }

  getAccessInfo(ns: NS) {
    return {
      ...this.getBaseInfo(ns),
      hackLevel: this.hackLevel,
      portsRequired: this.portsRequired,
    };
  }

  getTimesInfo(ns: NS) {
    return {
      ...this.getBaseInfo(ns),
      hackTime: ns.getHackTime(this.name),
      growTime: ns.getGrowTime(this.name),
      weakenTime: ns.getWeakenTime(this.name),
      bestWeakenTime: ns.formulas.hacking.weakenTime(this.mock, ns.getPlayer()),
    };
  }

  getStatusInfo(ns: NS) {
    const sec = ns.getServerSecurityLevel(this.name);
    return {
      ...this.getBaseInfo(ns),
      sec,
      minSec: this.minSec,
      secDiff: sec - this.minSec,
      hackChance: ns.hackAnalyzeChance(this.name),
      maxMoney: this.maxMoney,
      balance: ns.getServerMoneyAvailable(this.name),
    };
  }

  getProfitabilityInfo(ns: NS) {
    const sec = ns.getServerSecurityLevel(this.name);
    const bestTime = ns.formulas.hacking.weakenTime(this.mock, ns.getPlayer());
    const hackChance = ns.formulas.hacking.hackChance(
      this.mock,
      ns.getPlayer()
    );
    return {
      ...this.getBaseInfo(ns),
      secDiff: sec - this.minSec,
      estimatedHackChance: hackChance,
      maxMoney: this.maxMoney,
      weakenTime: ns.getWeakenTime(this.name),
      bestWeakenTime: bestTime,
      estimatedProfit: (this.maxMoney / 2 / bestTime) * hackChance,
    };
  }
}

export async function main(ns: NS) {
  let servers = getServerFlatMap(ns).map(
    (server: Record<string, any>) => new BBServer(ns, server.name)
  );

  const pservers = servers.filter((server) => server.name.includes("pserv"));
  servers = servers.filter((server) => !server.name.includes("pserv"));

  let profitableServers = servers
    .filter((server) => server.maxMoney > 0)
    .sort((a, b) => b.maxMoney - a.maxMoney);

  //   const highestBalance = profitableServers[0].maxMoney;

  //   profitableServers = profitableServers.filter(
  //     (server) => server.maxMoney >= highestBalance / 1000
  //   );

  let statuses = [
    [
      "name",
      "hasAccess",
      "secDiff",
      "est. hackChance",
      "maxMoney",
      "weakenTime (min)",
      "bestWeakenTime (min)",
      "est. profit (sec)", // if only one loop in weaken time
    ],
    ...profitableServers
      .sort((a, b) => {
        const aInfo = a.getProfitabilityInfo(ns);
        const bInfo = b.getProfitabilityInfo(ns);
        return bInfo.estimatedProfit - aInfo.estimatedProfit;
      })
      .map((server) => {
        const info = server.getProfitabilityInfo(ns);
        return [
          info.name,
          info.hasAccess,
          ns.formatNumber(info.secDiff, 2),
          ns.formatPercent(info.estimatedHackChance),
          ns.formatNumber(info.maxMoney, 2),
          ns.formatNumber(info.weakenTime / 60000, 2),
          ns.formatNumber(info.bestWeakenTime / 60000, 2),
          ns.formatNumber(info.estimatedProfit * 1000, 2),
        ];
      }),
  ];

  ns.clearLog();
  ns.tail();
  let table = new Table(statuses, true);

  table.changeColorForColumn(2, "yellow", (val: number) => val < 5);
  table.changeColorForColumn(2, "green", (val: number) => val < 2.5);

  ns.print(table.toString());
}
