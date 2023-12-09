import { NS } from "@ns";
import {
  RamCostsType,
  ThreadsObjectType,
} from "/fs/lib/servers/BBServer/types";
import type { BBServer } from "/fs/lib/servers/BBServer/index";

/**
 * Class responsible for calculating threads to servers.
 */
export default class Threader {
  ns: NS;
  info: {
    securityChanges: ThreadsObjectType;
    scriptRam: RamCostsType;
  };
  hackPercentageGoal: number = 0.5;

  constructor(ns: NS) {
    this.ns = ns;
    this.info = {
      securityChanges: {
        weaken: this.ns.weakenAnalyze(1),
        grow: this.ns.growthAnalyzeSecurity(1),
        hack: this.ns.hackAnalyzeSecurity(1),
      },
      scriptRam: {
        weaken: this.ns.getScriptRam("fs/bin/weaken.js"),
        grow: this.ns.getScriptRam("fs/bin/grow.js"),
        hack: this.ns.getScriptRam("fs/bin/hack.js"),
        total: 0,
      },
    };
  }

  getRamCosts(
    threads: ThreadsObjectType = {
      weaken: 1,
      grow: 1,
      hack: 1,
    }
  ): RamCostsType {
    const costs = {
      weaken: threads.weaken * this.info.scriptRam.weaken,
      grow: threads.grow * this.info.scriptRam.grow,
      hack: threads.hack * this.info.scriptRam.hack,
    };
    return {
      ...costs,
      total: Math.max(0, costs.weaken + costs.grow + costs.hack),
    };
  }

  /**
   * Calculates the number of threads required to break a server. (Break means security at minimum).
   * @param target The target server.
   * @returns The number of threads required to break the target server.
   */
  getThreadsToBreak(target: BBServer): ThreadsObjectType {
    const { hackDifficulty, minDifficulty } = target.obj;
    return {
      weaken: Math.ceil(
        (hackDifficulty - minDifficulty) / this.info.securityChanges.weaken
      ),
      grow: 0,
      hack: 0,
    };
  }

  /**
   * Calculates the number of threads required to fluff a server. (Fluff means security at minimum and money at max).
   * @param target The target server.
   * @param only Whether or not to include the threads to break the server.
   * @returns The number of threads required to fluff the target server.
   */
  getThreadsToFluff(target: BBServer, only = false): ThreadsObjectType {
    const { hostname, moneyAvailable, moneyMax } = target.obj;

    const multToMaxMoney = moneyMax / Math.max(moneyAvailable, 1);
    const growThreads = Math.ceil(
      this.ns.growthAnalyze(hostname, multToMaxMoney)
    );
    const growSecIncrease = growThreads * this.info.securityChanges.grow;
    const weakenThreads = Math.ceil(
      growSecIncrease / this.info.securityChanges.weaken
    );

    if (only) {
      return {
        weaken: weakenThreads,
        grow: growThreads,
        hack: 0,
      };
    }

    const threads = this.getThreadsToBreak(target);
    threads.weaken += weakenThreads;
    threads.grow += growThreads;
    return threads;
  }

  /**
   * Calculates the number of threads required to hack a server. Note that this operates on a mock of the provided server.
   * @param target The target server.
   * @param only Whether or not to include the threads to break and fluff the server.
   * @returns The number of threads required to hack the target server.
   */
  getThreadsToHack(target: BBServer, only = false): ThreadsObjectType {
    const player = this.ns.getPlayer();
    const mock = target.createMock();
    const { moneyMax } = mock;

    // Calculate hack threads
    const singleHackThreadPercentage = this.ns.formulas.hacking.hackPercent(
      mock,
      player
    );

    // If the hack percentage is 0, we can't hack it.
    // Typically see this if hack level isn't high enough.
    if (singleHackThreadPercentage === 0)
      return { weaken: -1, grow: -1, hack: -1 };

    const hackThreads = Math.max(
      Math.floor(this.hackPercentageGoal / singleHackThreadPercentage),
      1
    );

    // Simulate hack and get grow threads
    const percentRemaining = 1 - singleHackThreadPercentage * hackThreads;
    mock.moneyAvailable = moneyMax * percentRemaining;
    const growThreads = Math.ceil(
      this.ns.formulas.hacking.growThreads(mock, player, moneyMax)
    );
    mock.moneyAvailable = moneyMax;

    // Calculate weaken threads
    const totalSecIncrease =
      growThreads * this.info.securityChanges.grow +
      hackThreads * this.info.securityChanges.hack;
    const weakenThreads = Math.ceil(
      totalSecIncrease / this.info.securityChanges.weaken
    );

    if (only) {
      return {
        weaken: weakenThreads,
        grow: growThreads,
        hack: hackThreads,
      };
    }

    let threads = this.getThreadsToFluff(target);
    threads.weaken += weakenThreads;
    threads.grow += growThreads;
    threads.hack += hackThreads;

    return threads;
  }
}
