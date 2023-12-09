import { NS } from "@ns";
import type { ThreadsObjectType } from "fs/lib/servers/BBServer/types";
import type { BBServer } from "fs/lib/servers/BBServer/index";
import Configurable from "fs/lib/abstract/Configurable";

type TargetStatusType = {
  canHack: boolean;
  estHackingChance: number;
  currentWeakenTime: number;
  estHackTime: number;
  ramToFluff: number;
  itersToFluff: number;
  estFluffTime: number;
  estTimeToProfit: number;
  ramToHack: number;
  hackEfficiency: number;
  estProfitPerSecondPerGig: number;
  estActualProfitPerSecondPerGig: number;
};

export type TAnalyzedServer = {
  server: BBServer;
  targetScore: number;
  threadsToHack: ThreadsObjectType;
  status: TargetStatusType;
};

export type HunterConfigType = {
  profitWeight: number;
};

/**
 * Analyzes a server to determine the best way to attack it.
 * Also provides information about the server's current state.
 * @config profitWeight - The weight to apply to profit when scoring targets. Must be between 0 and 1. Default 1.
 * The score will weight time to profit by (1 - profitWeight).
 */
export default class Hunter extends Configurable<HunterConfigType> {
  ns: NS;

  constructor(ns: NS, config: Partial<HunterConfigType> = {}) {
    const defaultConfig: HunterConfigType = {
      profitWeight: 1,
    };
    // Clamp the profit weight between 0 and 1.
    const inConfig = {
      profitWeight: Math.min(
        Math.max(config.profitWeight || defaultConfig.profitWeight, 0),
        1
      ),
    };
    super({ ...defaultConfig, ...inConfig });
    this.ns = ns;
  }

  /**
   * Provides an array of targets ordered by their score. Scores are calculated based on
   * estimated profit.
   * @param targets An array of servers to score.
   * @param workers An array of servers to use as workers.
   */
  scoreTargets(targets: BBServer[], workers: BBServer[]) {
    const totalAvailableRam = workers.reduce(
      (sum, server) => sum + server.obj.maxRam,
      0
    );
    // const profitScore =
    //   status.estActualProfitPerSecondPerGig * this.config.profitWeight;
    const targetsWithInfo = targets
      .map((t) => {
        const analysis = this.analyze(t, totalAvailableRam);
        const analyzedServer: TAnalyzedServer = {
          server: t,
          targetScore: 0,
          ...analysis,
        };
        return analyzedServer;
      })
      .filter((t) => t.status.canHack);

    const minTimeToProfit = targetsWithInfo
      .filter((t) => t.status.estTimeToProfit > 0)
      .reduce((min, t) => Math.min(min, t.status.estTimeToProfit), Infinity);

    const [averageProfit, averageTimeToProfit] = targetsWithInfo
      .reduce(
        (acc, t) => {
          acc[0] += t.status.estActualProfitPerSecondPerGig;
          acc[1] += t.status.estTimeToProfit;
          return acc;
        },
        [0, 0]
      )
      .map((s) => s / targetsWithInfo.length);

    // console.log(averageTimeToProfit, minTimeToProfit);

    targetsWithInfo.forEach((t) => {
      const profitScore =
        t.status.estActualProfitPerSecondPerGig * this.config.profitWeight;
      const timeScore =
        (1 - this.config.profitWeight) *
        averageProfit *
        (Math.log(minTimeToProfit) / Math.log(t.status.estTimeToProfit));

      // console.log(t.server.name, profitScore, timeScore);
      t.targetScore = profitScore + timeScore;
    });

    return targetsWithInfo.sort((a, b) => b.targetScore - a.targetScore);
  }

  private analyze(target: BBServer, totalAvailableRam: number) {
    const threadsToFluff = target.threader.getThreadsToFluff(target);
    const threadsToHack = target.threader.getThreadsToHack(target, true);
    const status = this.getStatus(
      target,
      threadsToFluff,
      threadsToHack,
      totalAvailableRam
    );
    return {
      threadsToHack,
      threadsToFluff,
      status,
    };
  }

  private getStatus(
    target: BBServer,
    threadsToFluff: ThreadsObjectType,
    threadsToHack: ThreadsObjectType,
    totalAvailableRam: number
  ): TargetStatusType {
    const player = this.ns.getPlayer();
    const mock = target.createMock();
    const estHackingChance = this.ns.formulas.hacking.hackChance(mock, player);
    const canHack =
      target.obj.hasAdminRights &&
      target.obj.requiredHackingSkill <= player.skills.hacking &&
      threadsToHack.hack > 0 &&
      estHackingChance > 0;

    if (!canHack) {
      return {
        canHack,
        estHackingChance: 0,
        currentWeakenTime: 0,
        estHackTime: 0,
        ramToFluff: 0,
        itersToFluff: 0,
        estFluffTime: 0,
        estTimeToProfit: 0,
        ramToHack: 0,
        hackEfficiency: 0,
        estProfitPerSecondPerGig: 0,
        estActualProfitPerSecondPerGig: 0,
      };
    }

    const currentWeakenTime = this.ns.getWeakenTime(target.obj.hostname);
    const estHackTime = this.ns.formulas.hacking.weakenTime(mock, player);

    const ramToFluff = target.threader.getRamCosts(threadsToFluff).total;
    const itersToFluff = Math.floor(ramToFluff / totalAvailableRam);
    const estFluffTime = currentWeakenTime * itersToFluff;

    const estTimeToProfit = estFluffTime * itersToFluff + estHackTime;

    const ramToHack = target.threader.getRamCosts(threadsToHack).total;
    const hackEfficiency = Math.min(totalAvailableRam / ramToHack, 1);

    const estProfitPerSecondPerGig =
      (target.obj.moneyMax / estHackTime / ramToHack) *
      target.threader.hackPercentageGoal *
      1000;

    const estActualProfitPerSecondPerGig =
      estProfitPerSecondPerGig * hackEfficiency * estHackingChance;

    return {
      canHack,
      estHackingChance,
      currentWeakenTime,
      estHackTime,
      ramToFluff,
      itersToFluff,
      estFluffTime,
      estTimeToProfit,
      ramToHack,
      hackEfficiency,
      estProfitPerSecondPerGig,
      estActualProfitPerSecondPerGig,
    };
  }
}
