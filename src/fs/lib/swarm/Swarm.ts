import { NS } from "@ns";
import BBServer from "fs/lib/servers/BBServer";
import { createUUID } from "fs/lib/util/index";

export const SWARM_FILES = {
  WEAKEN: "fs/bin/weaken.js",
  GROW: "fs/bin/grow.js",
  HACK: "fs/bin/hack.js",
};

/**
 * Launches a swarm against a target server (or all target servers).
 */
export default class Swarm {
  ns: NS;
  servers: BBServer[];
  task: "WEAKEN" | "FLUFF" | "HACK" | "SWEEP";
  target: string | null;
  swarmId: string = "";
  swarmFiles = SWARM_FILES;

  constructor(
    ns: NS,
    servers: BBServer[],
    task: "WEAKEN" | "FLUFF" | "HACK" | "SWEEP" = "SWEEP",
    target: string | null = null
  ) {
    this.ns = ns;
    this.servers = servers;
    this.task = task;
    this.target = target;
    this.swarmId = task + "_" + createUUID();

    if (this.target == null && task !== "SWEEP") {
      throw new Error(`No target provided for single-target task '${task}'`);
    }
  }

  putFilesOnServers() {
    this.servers.forEach((server) => {
      console.debug(`Putting files on ${server.name}`);
      Object.values(this.swarmFiles).forEach((file) => {
        this.ns.scp(file, server.name);
      });
    });
  }

  setPartitions() {
    this.servers.forEach((server) => {
      const ram = server.availableRam();
      if (ram === 0) return;
      server.createPartition(ram, this.swarmId);
    });
  }

  getPartitionedServers() {
    return this.servers.filter((server) => {
      return server.partitions.find((part) => {
        return part.name === this.swarmId;
      });
    });
  }

  getPartitionedRam() {
    return this.servers
      .map((server) => {
        const part = server.partitions.find((part) => {
          return part.name === this.swarmId;
        });
        return part == null
          ? null
          : {
              name: server.name,
              ram: part.ramReserved,
            };
      })
      .filter((part) => part != null && part.ram >= 4);
  }

  clearPartitions() {
    this.servers.forEach((server) => {
      server.removePartition(this.swarmId);
    });
  }

  // Meant to be overwritten
  async swarm(callback: Function = async () => {}) {
    this.putFilesOnServers();
    this.setPartitions();
    await callback(this.getPartitionedRam()); // Main swarm logic/loop
    this.clearPartitions();
  }
}
