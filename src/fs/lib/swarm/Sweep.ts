import { NS } from "@ns";
import BBServer, { PartitionType } from "fs/lib/servers/BBServer";
import Swarm from "fs/lib/swarm/Swarm";
import { convertMSToHHMMSS, timePrint } from "fs/lib/util/index";
import { getServerFlatMap } from "fs/bin/servers/getServerMap";

type TargetType = {
  name: string;
  weakenTime: number;
};

type SwarmServerType = {
  name: string;
  ram: number;
};

export default class Sweep extends Swarm {
  targets: TargetType[] = [];
  timeGateSec: number;

  constructor(ns: NS, servers: BBServer[], timeGateSec: number = -1) {
    super(ns, servers, "SWEEP");
    this.targets = getServerFlatMap(ns, (server: string) => {
      return { name: server, weakenTime: ns.getWeakenTime(server) };
    }) as Array<TargetType>;
    this.timeGateSec = timeGateSec;
  }

  async start() {
    await this.swarm(async (servers: SwarmServerType[]) => {
      this.targets = this.targets
        .filter((t) => this.ns.hasRootAccess(t.name))
        .sort((a, b) => {
          return a.weakenTime - b.weakenTime;
        });
      const weakenRam = this.ns.getScriptRam(this.swarmFiles.WEAKEN);

      for (let i = 0; i < this.targets.length; i++) {
        // this.targets.forEach(async (target) => {
        const target = this.targets[i];
        const targetServer = this.servers.find((t) => {
          return t.name === target.name;
        });
        if (targetServer == null) continue;
        if (
          this.ns.getServerSecurityLevel(target.name) ==
          this.ns.getServerMinSecurityLevel(target.name)
        ) {
          timePrint(
            this.ns,
            `Skipping '${target.name}' due to min security...`
          );
          continue;
        } else if (!this.ns.hasRootAccess(target.name)) {
          timePrint(
            this.ns,
            `Skipping '${target.name}' due to no root access...`
          );
          continue;
        } else if (
          this.timeGateSec > 0 &&
          target.weakenTime > this.timeGateSec * 1000
        ) {
          timePrint(
            this.ns,
            `Skipping '${target.name}' due to time gate of ${this.timeGateSec} seconds...`
          );
          continue;
        }
        if (targetServer.obj.minDifficulty == null) {
          continue;
        }
        while (
          this.ns.getServerSecurityLevel(target.name) >
          targetServer.obj.minDifficulty
        ) {
          timePrint(this.ns, `Weakening '${target.name}'...`);
          const sec = this.ns.getServerSecurityLevel(target.name);
          const secDiff = sec - targetServer.obj.minDifficulty;
          let threads = 0;
          servers.forEach((server: SwarmServerType) => {
            const weakenThreads = Math.floor(server.ram / weakenRam);
            threads += weakenThreads;
            this.ns.scp(this.swarmFiles.WEAKEN, server.name);
            this.ns.exec(
              this.swarmFiles.WEAKEN,
              server.name,
              weakenThreads,
              target.name,
              weakenThreads
            );
          });

          const secReduction = threads * this.ns.weakenAnalyze(1);
          const waitTime = this.ns.getWeakenTime(target.name) + 1000;

          timePrint(
            this.ns,
            `+${secDiff.toFixed(3)} => +${Math.max(
              0,
              secDiff - secReduction
            ).toFixed(3)} (${convertMSToHHMMSS(waitTime)})`
          );

          await this.ns.sleep(waitTime + 2000);
        }
        await this.ns.sleep(100);
      }
    });
  }
}
