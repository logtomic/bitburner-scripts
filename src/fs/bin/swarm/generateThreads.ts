import { NS } from "@ns";

export type StageThreadsType = {
  stageOne: {
    can: boolean;
    weaken: number;
  };
  stageTwo: {
    can: boolean;
    grow: number;
    weaken: number;
    growsPerWeaken: number;
  };
  stageThree: {
    can: boolean;
    hack: number;
    grow: number;
    weaken: number;
    threadRatios: number[];
  };
};

export default function getStageThreads(ns: NS, target: string) {
  const obj: StageThreadsType = {
    stageOne: {
      can: true,
      weaken: -1,
    },
    stageTwo: {
      can: false,
      grow: -1,
      weaken: -1,
      growsPerWeaken: -1,
    },
    stageThree: {
      can: false,
      hack: -1,
      grow: -1,
      weaken: -1,
      threadRatios: [-1, -1, -1],
    },
  };

  let money = ns.getServerMoneyAvailable(target);
  if (money === 0) money = 1;
  const maxMoney = ns.getServerMaxMoney(target);
  const minSec = ns.getServerMinSecurityLevel(target);
  const sec = ns.getServerSecurityLevel(target);
  const weakenReduction = ns.weakenAnalyze(1);

  // Stage 1 weaken
  // If security is not minimum, we won't get accurate
  // thread counts for hack and grow
  obj.stageOne["weaken"] = Math.ceil((sec - minSec) / weakenReduction);
  // if (obj.stageOne["weaken"] > 0) return {...obj, stage: 1, status: "Weakening target to min security"};
  // Stage 2 grow to max funds and weaken
  // If money isn't at least half, we won't obtain
  // hack & grow thread efficiency
  obj.stageTwo["can"] = true;
  obj.stageTwo["grow"] = Math.ceil(ns.growthAnalyze(target, maxMoney / money));
  obj.stageTwo["weaken"] = Math.ceil(
    (obj.stageTwo["grow"] * 0.004) / weakenReduction
  );
  obj.stageTwo["growsPerWeaken"] = 12;
  if (money < maxMoney / 2 || obj.stageOne["weaken"] > 0)
    return { ...obj, stage: 2, status: "Fluffing target" };

  // Stage 3 hack half, grow back, clean up sec
  // Gather ratios just in case we can only hack a partial amount
  obj.stageThree["can"] = true;
  obj.stageThree["hack"] = Math.floor(
    ns.hackAnalyzeThreads(target, money - maxMoney / 2)
  );
  if (obj.stageThree["hack"] >= 0) {
    if (obj.stageThree["hack"] == 0) {
      // hack threads so powerful, 1 will hack more than half
      obj.stageThree["hack"] = 1;
      obj.stageThree["grow"] = Math.ceil(
        ns.growthAnalyze(target, 1 / ns.hackAnalyze(target))
      );
    } else {
      // Adjust number of threads by offset created from hack security increase
      const hackSecOffset = obj.stageThree["hack"] * 0.002;
      const growThreadMultiplier = (sec + hackSecOffset) / sec;
      obj.stageThree["grow"] = Math.ceil(
        ns.growthAnalyze(target, 2) * growThreadMultiplier
      );
    }
    obj.stageThree["weaken"] = Math.ceil(
      (obj.stageThree["grow"] * 0.004 + obj.stageThree["hack"] * 0.002) /
        weakenReduction
    );
    obj.stageThree["threadRatios"] = getWeakenRatios(
      obj.stageThree["hack"],
      obj.stageThree["grow"],
      weakenReduction
    );
  }
  return { ...obj, stage: 3, status: "Hacking at least some of target" };
}

// Returns the ratios between the types of threads
function getWeakenRatios(
  hackThreadCount: number,
  growThreadCount: number,
  weakenReduction: number
) {
  const totalSecIncrease = growThreadCount * 0.004 + hackThreadCount * 0.002;
  let totalWeakenThreads = Math.ceil(totalSecIncrease / weakenReduction);

  // Base on weaken threads first
  let hackRatio = hackThreadCount / totalWeakenThreads;
  let growRatio = growThreadCount / totalWeakenThreads;
  let weakenRatio = 1;

  // If necessary, base on hack threads
  if (hackRatio < 1) {
    growRatio = growRatio / hackRatio;
    weakenRatio = weakenRatio / hackRatio;
    hackRatio = 1;
  }

  // Always round down hacks and round up grow/weaken
  return [Math.floor(hackRatio), Math.ceil(growRatio), Math.ceil(weakenRatio)];
}
