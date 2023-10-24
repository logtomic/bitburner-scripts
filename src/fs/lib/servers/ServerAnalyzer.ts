import { NS, Server } from "@ns";

type IndexableServer = Server & Record<string, any>;

type ThreadsType = {
  weaken: number;
  grow: number;
  hack: number;
};

type RamCostsType = ThreadsType & {
  total: number;
};

/**
 * Analyzes a server to determine the best way to attack it.
 * Also provides information about the server's current state.
 */
export default class ServerAnalyzer {
  ns: NS;
  mock: IndexableServer;
  securityChanges: Record<string, number>;
  scriptRam: Record<string, number>;
  config: {
    hackPercentageGoal: number;
  } = {
    hackPercentageGoal: 0.5,
  };

  constructor(ns: NS, mock: IndexableServer) {
    this.ns = ns;
    this.mock = mock;

    this.securityChanges = {
      weaken: this.ns.weakenAnalyze(1),
      grow: this.ns.growthAnalyzeSecurity(1),
      hack: this.ns.hackAnalyzeSecurity(1),
    };

    this.scriptRam = {
      weaken: ns.getScriptRam("fs/bin/weaken.js"),
      grow: ns.getScriptRam("fs/bin/grow.js"),
      hack: ns.getScriptRam("fs/bin/hack.js"),
    };
  }

  changeHackPercentGoal(newGoal: number) {
    if (newGoal < 0.1 || newGoal > 1) {
      throw new Error(
        `Invalid hack percentage goal: ${newGoal}. Must be between 0.1 and 1.`
      );
    }
    this.config.hackPercentageGoal = newGoal;
  }

  getThreadsToMinSec(): ThreadsType {
    const { hackDifficulty, minDifficulty } = this.ns.getServer(
      this.mock.hostname
    );
    if (hackDifficulty == null || minDifficulty == null)
      return { weaken: -1, grow: -1, hack: -1 };
    return {
      weaken: (hackDifficulty - minDifficulty) / this.securityChanges.weaken,
      grow: 0,
      hack: 0,
    };
  }

  /**
   *
   * @param assume If true, assumes that the server is already at min security.
   * @returns
   */
  getThreadsToFluffed(assume: boolean = false): ThreadsType {
    // If assume is true, assumes that the server is already at min security.
    const { moneyAvailable, moneyMax } = this.ns.getServer(this.mock.hostname);
    if (moneyAvailable == null || moneyMax == null)
      return { weaken: -1, grow: -1, hack: -1 };

    const multToMaxMoney = moneyMax / moneyAvailable;
    const growThreads = Math.ceil(
      this.ns.growthAnalyze(this.mock.hostname, multToMaxMoney)
    );
    const growSecIncrease = growThreads * this.securityChanges.grow;
    const weakenThreads = Math.ceil(
      growSecIncrease / this.securityChanges.weaken
    );

    if (assume) {
      return { weaken: weakenThreads, grow: growThreads, hack: 0 };
    }

    const threads = this.getThreadsToMinSec();
    threads.weaken += weakenThreads;
    threads.grow += growThreads;
    return threads;
  }

  /**
   *
   * @param assume If true, assumes that the server is already fluffed.
   * @returns
   */
  getThreadsToHack(assume: boolean = false): ThreadsType {
    // If assume is true, assumes the server is already fluffed.
    // Very helpful for calculating estimated profits.
    const { moneyMax } = this.mock;
    if (moneyMax == null) return { weaken: -1, grow: -1, hack: -1 };
    const player = this.ns.getPlayer();

    // Calculate hack threads
    const singleHackThreadPercentage = this.ns.formulas.hacking.hackPercent(
      this.mock,
      player
    );
    const hackThreads = Math.max(
      Math.floor(this.config.hackPercentageGoal / singleHackThreadPercentage),
      1
    );

    // Simulate hack and get grow threads
    const percentRemaining = 1 - singleHackThreadPercentage * hackThreads;
    this.mock.moneyAvailable = moneyMax * percentRemaining;
    const growThreads = Math.ceil(
      this.ns.formulas.hacking.growThreads(this.mock, player, moneyMax)
    );
    this.mock.moneyAvailable = moneyMax;

    // Calculate weaken threads
    const totalSecIncrease =
      growThreads * this.securityChanges.grow +
      hackThreads * this.securityChanges.hack;
    const weakenThreads = Math.ceil(
      totalSecIncrease / this.securityChanges.weaken
    );

    if (assume) {
      return { weaken: weakenThreads, grow: growThreads, hack: hackThreads };
    }

    let threads = this.getThreadsToFluffed();
    threads.weaken += weakenThreads;
    threads.grow += growThreads;
    threads.hack += hackThreads;

    return threads;
  }

  getRamCosts(
    threads: ThreadsType = {
      weaken: 1,
      grow: 1,
      hack: 1,
    }
  ): RamCostsType {
    const costs = {
      weaken: threads.weaken * this.scriptRam.weaken,
      grow: threads.grow * this.scriptRam.grow,
      hack: threads.hack * this.scriptRam.hack,
    };
    return {
      ...costs,
      total: costs.weaken + costs.grow + costs.hack,
    };
  }
}
