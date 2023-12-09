import { NS, Server, Player } from "@ns";
import ServerAnalyzer from "/fs/lib/servers/ServerAnalyzer";

export type IndexableServer = Server & Record<string, any>;

export type ProfitInfo = {
  securityDiff: number;
  weakenTime: number;
  bestWeakenTime: number;
  estimatedHackChance: number;
  estimatedProfit: number;
};

export class BBServer {
  ns: NS;
  name: string;
  obj: IndexableServer | null;
  playerRef: Player;

  constructor(ns: NS, name: string = "") {
    this.ns = ns;
    this.name = name;
    this.obj = this.getServerObject();
    this.playerRef = ns.getPlayer();
  }

  getServerObject() {
    return this.ns.getServer(this.name);
  }

  refresh() {
    this.obj = this.getServerObject();
    this.playerRef = this.ns.getPlayer();
  }
}

export class TargetServer extends BBServer {
  mock: IndexableServer;
  analyzer: ServerAnalyzer;
  profitInfo: ProfitInfo;
  constructor(ns: NS, name: string) {
    super(ns, name);
    this.mock = this.ns.formulas.mockServer();
    this.analyzer = new ServerAnalyzer(ns, this.mock);
    this.profitInfo = this.getProfitabilityInfo();

    if (this.obj) {
      this.mock.minDifficulty = this.obj.minDifficulty;
      this.mock.baseDifficulty = this.obj.baseDifficulty;
      this.mock.moneyMax = this.obj.moneyMax;
      this.mock.requiredHackingSkill = this.obj.requiredHackingSkill;
      this.mock.hasAdminRights = true;

      this.mock.moneyAvailable = this.obj.moneyMax;
      this.mock.hackDifficulty = this.obj.minDifficulty;
    }
  }

  refresh() {
    super.refresh();
    this.profitInfo = this.getProfitabilityInfo();
  }

  getProfitabilityInfo(): ProfitInfo {
    const player = this.ns.getPlayer();
    const sec = this.ns.getServerSecurityLevel(this.name);
    const bestTime = this.ns.formulas.hacking.weakenTime(this.mock, player);
    const hackChance = this.ns.formulas.hacking.hackChance(this.mock, player);

    return {
      securityDiff: sec - (this.mock.minDifficulty ?? 0),
      estimatedHackChance: hackChance,
      weakenTime: this.ns.getWeakenTime(this.name),
      bestWeakenTime: bestTime,
      estimatedProfit: ((this.mock.moneyMax ?? 0) / 2 / bestTime) * hackChance,
    };
  }
}

export class TaskServer extends BBServer {
  constructor(ns: NS, name: string) {
    super(ns, name);
  }
}

export class PlayerServer extends TaskServer {
  constructor(ns: NS, name: string | null) {
    super(ns, name ? name : "");
  }
}

export class HomeServer extends TaskServer {
  constructor(ns: NS) {
    super(ns, "home");
  }
}
