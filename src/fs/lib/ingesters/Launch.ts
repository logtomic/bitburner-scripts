import { NS } from "@ns";
import type { BBServer } from "fs/lib/servers/BBServer/index";
import { ThreadsObjectType } from "fs/lib/servers/BBServer/types";
import constants from "fs/lib/constants";
import {
  convertMSToHHMMSS,
  createUUID,
  localeHHMMSS,
  timePrint,
} from "/fs/lib/util/index";

type ActionType = "WEAKEN" | "GROW" | "HACK";

const actionLookup: Record<ActionType, string> = {
  WEAKEN: constants.files.bin.weaken,
  GROW: constants.files.bin.grow,
  HACK: constants.files.bin.hack,
};

type LaunchAction = {
  server: BBServer;
  action: ActionType;
  threads: number;
};

type LaunchWorkerType = {
  server: BBServer;
  ramAvailable: number;
};

type LaunchPlan = LaunchAction[];

type LaunchOptions = {
  iterations?: number;
};

export default class Launch {
  ns: NS;
  plan: LaunchPlan = [];
  target: BBServer;
  workers: BBServer[];
  id: string;

  constructor(ns: NS, target: BBServer, workers: BBServer[]) {
    this.ns = ns;
    this.target = target;
    this.workers = workers;
    this.id = createUUID();
  }

  condensePlan() {
    const condensedPlan: LaunchPlan = [];
    const workers = this.plan.reduce(
      (servers: BBServer[], action: LaunchAction) => {
        if (!servers.includes(action.server)) {
          servers.push(action.server);
        }
        return servers;
      },
      []
    );
    workers.forEach((worker) => {
      ["WEAKEN", "GROW", "HACK"].forEach((action) => {
        const actions = this.plan.filter(
          (a) => a.server.name === worker.name && a.action === action
        );
        if (actions.length > 0) {
          condensedPlan.push({
            server: worker,
            action: action as ActionType,
            threads: actions.reduce((total, a) => total + a.threads, 0),
          });
        }
      });
    });
    this.plan = condensedPlan;
  }

  private generatePlan() {
    this.plan = [];
    let simpleWorkers: LaunchWorkerType[] = this.workers
      .map((w) => ({
        server: w,
        ramAvailable: w.availableRam,
      }))
      .sort((a, b) => b.ramAvailable - a.ramAvailable);

    // Loop through workers and assign as possible
    // If all assigned, stop here
    // console.log("MinSec threads: ", minSecThreads);
    simpleWorkers = this.assignThreads(
      simpleWorkers,
      this.target.threader.getThreadsToBreak(this.target)
    );
    if (simpleWorkers.length === 0) {
      this.condensePlan();
      return;
    }

    // console.log("Fluff threads: ", fluffThreads);
    simpleWorkers = this.assignThreads(
      simpleWorkers,
      this.target.threader.getThreadsToFluff(this.target, true)
    );
    if (simpleWorkers.length === 0) {
      this.condensePlan();
      return;
    }

    // console.log("Hacking threads", hackableThreads);
    simpleWorkers = this.assignThreads(
      simpleWorkers,
      this.target.threader.getThreadsToHack(this.target, true)
    );
    if (simpleWorkers.length === 0) {
      this.condensePlan();
      return;
    }

    this.condensePlan();
  }

  private initWorkers() {
    // SCP all files onto workers
    const files = [
      constants.files.bin.weaken,
      constants.files.bin.grow,
      constants.files.bin.hack,
    ];
    this.workers.forEach((worker) => {
      this.ns.scp(files, worker.name, "home");
    });
  }

  private runPlan() {
    this.plan.forEach((launch) => {
      const pid = this.ns.exec(
        actionLookup[launch.action],
        launch.server.name,
        launch.threads,
        this.target.name,
        launch.threads
      );
      if (pid > 0) {
        let msg = `${pid} - ${launch.server.name} - ${launch.action} (t=${launch.threads})`;
        this.ns.print(msg);
        // console.log(msg);
      } else {
        let msg = `Failed to launch ${launch.action} on ${launch.server.name} with ${launch.threads} threads`;
        this.ns.print(msg);
        // console.log(msg);
      }
    });
  }

  async start(options: LaunchOptions) {
    let iteration = 0;
    this.initWorkers();

    const totalIterations = Math.max(options.iterations ?? 1, 1);

    while (iteration < totalIterations) {
      this.ns.clearLog();
      this.target.refresh();
      this.generatePlan();
      this.runPlan();

      iteration++;

      const weakenTime = this.ns.getWeakenTime(this.target.name);

      const estimatedMsToComplete =
        weakenTime * (totalIterations - iteration + 1);

      timePrint(this.ns, `Iteration: ${iteration} / ${totalIterations}`);

      timePrint(
        this.ns,
        `$${this.ns.formatNumber(
          this.target.obj.moneyAvailable
        )} / $${this.ns.formatNumber(
          this.target.obj.moneyMax
        )} (${this.ns.formatPercent(
          this.target.obj.moneyAvailable / this.target.obj.moneyMax
        )})`
      );

      timePrint(
        this.ns,
        `${this.ns.formatNumber(this.target.obj.hackDifficulty)} / ${
          this.target.obj.minDifficulty
        } (+${this.ns.formatNumber(
          this.target.obj.hackDifficulty - this.target.obj.minDifficulty
        )})`
      );

      timePrint(this.ns, `Weaken time: ${convertMSToHHMMSS(weakenTime)}`);

      timePrint(
        this.ns,
        `Est. Finish Iteration: [${localeHHMMSS(
          new Date().getTime() + weakenTime
        )}]`
      );
      timePrint(
        this.ns,
        `Est. Finish All:       [${localeHHMMSS(
          new Date().getTime() + estimatedMsToComplete
        )}]`
      );

      await this.ns.sleep(weakenTime + 2000);
    }
  }

  /**
   * Provides thread ratios that is used to assign threads to weaken, grow, and hack
   * in such a way that progress is always made towards hackable.
   * @param threads A ThreadsObjectType object.
   */
  private getWeakenRatios(threads: ThreadsObjectType): ThreadsObjectType {
    if (threads.hack === 0 && threads.grow === 0)
      return { weaken: threads.weaken, hack: 0, grow: 0 };

    let hackRatio = threads.hack / threads.weaken;
    let growRatio = threads.grow / threads.weaken;
    let weakenRatio = 1;

    // If hackRatio is less than 1, base on hack threads
    if (hackRatio < 1 && hackRatio > 0) {
      growRatio = growRatio / hackRatio;
      weakenRatio = weakenRatio / hackRatio;
      hackRatio = 1;
    }

    // If no hackThreads and growThreads is less than 1, base on grow threads
    if (hackRatio === 0 && growRatio < 1 && growRatio > 0) {
      hackRatio = hackRatio / growRatio;
      weakenRatio = weakenRatio / growRatio;
      growRatio = 1;
    }

    return {
      weaken: Math.ceil(weakenRatio),
      grow: Math.ceil(growRatio),
      hack: Math.floor(hackRatio),
    };
  }

  private getAssignmentChunks(threads: ThreadsObjectType): ThreadsObjectType[] {
    const threadsCopy = { ...threads };
    const threadRatios = this.getWeakenRatios(threads);

    const chunks: ThreadsObjectType[] = [];

    let chunk;
    while (threadsCopy.weaken + threadsCopy.grow + threadsCopy.hack > 0) {
      chunk = { weaken: 0, grow: 0, hack: 0 };
      if (threadRatios.weaken === 0 || threadsCopy.weaken === 0) {
        // Do nothing
      } else if (threadRatios.weaken < threadsCopy.weaken) {
        threadsCopy.weaken -= threadRatios.weaken;
        chunk.weaken += threadRatios.weaken;
      } else if (threadRatios.weaken >= threadsCopy.weaken) {
        chunk.weaken += threadsCopy.weaken;
        threadsCopy.weaken = 0;
      }

      if (threadRatios.grow === 0 || threadsCopy.grow === 0) {
        // Do nothing
      } else if (threadRatios.grow < threadsCopy.grow) {
        threadsCopy.grow -= threadRatios.grow;
        chunk.grow += threadRatios.grow;
      } else if (threadRatios.grow >= threadsCopy.grow) {
        chunk.grow += threadsCopy.grow;
        threadsCopy.grow = 0;
      }

      if (threadRatios.hack === 0 || threadsCopy.hack === 0) {
        // Do nothing
      } else if (threadRatios.hack < threadsCopy.hack) {
        threadsCopy.hack -= threadRatios.hack;
        chunk.hack += threadRatios.hack;
      } else if (threadRatios.hack >= threadsCopy.hack) {
        chunk.hack += threadsCopy.hack;
        threadsCopy.hack = 0;
      }

      chunks.push({ ...chunk });
    }

    return chunks;
  }

  private assignThreads(
    workers: LaunchWorkerType[],
    threads: ThreadsObjectType
  ): LaunchWorkerType[] {
    // Weaken threads are already calculated based on hack and grow threads.
    // If there are no weaken threads, then there is nothing to do.
    if (threads.weaken === 0) return workers;
    const ram = {
      weaken: this.target.threader.info.scriptRam.weaken,
      grow: this.target.threader.info.scriptRam.grow,
      hack: this.target.threader.info.scriptRam.hack,
    };

    const assignmentChunks = this.getAssignmentChunks(threads);
    // console.log(assignmentChunks);
    let currentChunk = assignmentChunks.shift();
    let currentWorker = workers.shift();

    while (currentChunk != null && currentWorker != null) {
      // If the worker can take more threads, don't reassign
      // Otherwise, shift to the next worker
      // If the current chunk is empty, shift to the next chunk

      if (currentChunk.weaken > 0) {
        const weakenThreadsCurrentWorkerCanTake = Math.floor(
          currentWorker.ramAvailable / ram.weaken
        );
        if (weakenThreadsCurrentWorkerCanTake <= 0) {
          currentWorker = workers.shift();
          continue;
        } else if (weakenThreadsCurrentWorkerCanTake >= currentChunk.weaken) {
          currentWorker.ramAvailable -= ram.weaken * currentChunk.weaken;
          this.plan.push({
            server: currentWorker.server,
            action: "WEAKEN",
            threads: currentChunk.weaken,
          });
          currentChunk.weaken = 0;
        } else if (weakenThreadsCurrentWorkerCanTake < currentChunk.weaken) {
          currentWorker.ramAvailable -=
            ram.weaken * weakenThreadsCurrentWorkerCanTake;
          this.plan.push({
            server: currentWorker.server,
            action: "WEAKEN",
            threads: weakenThreadsCurrentWorkerCanTake,
          });
          currentChunk.weaken -= weakenThreadsCurrentWorkerCanTake;
          currentWorker = workers.shift();
          continue;
        }
      }

      if (currentChunk.grow > 0) {
        const growThreadsCurrentWorkerCanTake = Math.floor(
          currentWorker.ramAvailable / ram.grow
        );
        if (growThreadsCurrentWorkerCanTake <= 0) {
          currentWorker = workers.shift();
          continue;
        } else if (growThreadsCurrentWorkerCanTake >= currentChunk.grow) {
          currentWorker.ramAvailable -= ram.grow * currentChunk.grow;
          this.plan.push({
            server: currentWorker.server,
            action: "GROW",
            threads: currentChunk.grow,
          });
          currentChunk.grow = 0;
        } else if (growThreadsCurrentWorkerCanTake < currentChunk.grow) {
          currentWorker.ramAvailable -=
            ram.grow * growThreadsCurrentWorkerCanTake;
          this.plan.push({
            server: currentWorker.server,
            action: "GROW",
            threads: growThreadsCurrentWorkerCanTake,
          });
          currentChunk.grow -= growThreadsCurrentWorkerCanTake;
          currentWorker = workers.shift();
          continue;
        }
      }

      if (currentChunk.hack > 0) {
        const hackThreadsCurrentWorkerCanTake = Math.floor(
          currentWorker.ramAvailable / ram.hack
        );
        if (hackThreadsCurrentWorkerCanTake <= 0) {
          currentWorker = workers.shift();
          continue;
        } else if (hackThreadsCurrentWorkerCanTake >= currentChunk.hack) {
          currentWorker.ramAvailable -= ram.hack * currentChunk.hack;
          this.plan.push({
            server: currentWorker.server,
            action: "HACK",
            threads: currentChunk.hack,
          });
          currentChunk.hack = 0;
        } else if (hackThreadsCurrentWorkerCanTake < currentChunk.hack) {
          currentWorker.ramAvailable -=
            ram.hack * hackThreadsCurrentWorkerCanTake;
          this.plan.push({
            server: currentWorker.server,
            action: "HACK",
            threads: hackThreadsCurrentWorkerCanTake,
          });
          currentChunk.hack -= hackThreadsCurrentWorkerCanTake;
          currentWorker = workers.shift();
          continue;
        }
      }

      if (currentChunk.weaken + currentChunk.grow + currentChunk.hack === 0) {
        currentChunk = assignmentChunks.shift();
      }
      workers.unshift(currentWorker);
    }

    return workers;
  }
}
