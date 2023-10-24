import { NS, Server } from "@ns";
import { unlockServer } from "fs/bin/servers/unlock";
import { createUUID } from "fs/lib/util/index";
import ServerAnalyzer from "fs/lib/servers/ServerAnalyzer";

type IndexableServer = Server & Record<string, any>;

export type PartitionType = {
  name: string; // should be a unique identifier, preferrably with a uuid
  ramReserved: number;
};

export type ServerStatusType =
  | "FREE" // Available, no task
  | "LAUNCHING" // Running HWGW cycles against a target
  | "SWARMING" // Part of a swarm
  | "FLUFFING" // Running grow/weaken cycles
  | "SHARING" // Using a server to share RAM with factions
  | "RESERVED";

export type TargetServerStatusType = ServerStatusType | "LOCKED";

export type PlayerServerStatusType = ServerStatusType | "NONE";

export default class BBServer {
  ns: NS;
  name: string;
  obj: IndexableServer;
  partitions: PartitionType[] = [];

  constructor(ns: NS, name: string) {
    this.ns = ns;
    this.name = name;
    this.obj = ns.getServer(name);
  }

  refresh() {
    this.obj = this.ns.getServer(this.name);
  }

  createPartition(ram: number, id: string = ""): PartitionType {
    console.debug(`Creating partition on ${this.name} with ${ram}GB`);
    const newId = id === "" ? createUUID() : id;
    const newPartition = {
      name: newId,
      ramReserved: ram,
    };
    return newPartition;
  }

  setPartition(partition: PartitionType) {
    console.debug(
      `Setting partition on ${this.name} with ${partition.ramReserved}GB`
    );
    this.partitions.push(partition);
  }

  removePartition(partitionName: string) {
    console.debug(`Removing partition on ${this.name} with ${partitionName}`);
    this.partitions = this.partitions.filter(
      (partition) => partition.name !== partitionName
    );
  }

  availableRam(percent: number = 1) {
    if (percent <= 0) return 0;
    const partitionedRam = this.partitions.reduce((sum, partition) => {
      return sum + partition.ramReserved;
    }, 0);
    const listedUse = this.ns.getServerUsedRam(this.name);
    const larger = Math.max(0, partitionedRam, listedUse);

    return Math.max(this.obj.maxRam - larger, 0) * Math.min(percent, 1);
  }
}

export class TargetServer extends BBServer {
  mock: IndexableServer;
  analyzer: ServerAnalyzer;
  status: TargetServerStatusType;
  constructor(ns: NS, name: string) {
    super(ns, name);
    this.mock = ns.formulas.mockServer();
    this.analyzer = new ServerAnalyzer(ns, this.mock);

    // Take all the keys from this.obj and apply them to this.mock
    for (const key in this.obj) {
      this.mock[key] = this.obj[key];
    }

    // Set the mock to the best case scenario for formulas
    this.mock.hackDifficulty = this.mock.minDifficulty;
    this.mock.moneyAvailable = this.mock.moneyMax;

    this.status = this.obj.hasAdminRights ? "FREE" : "LOCKED";
  }
  unlockSelf() {
    unlockServer(this.ns, this.name);
    this.refresh();
  }
  refresh() {
    super.refresh();
    if (this.status === "LOCKED" && this.obj.hasAdminRights) {
      this.status = "FREE";
    }
  }
}

export class PlayerServer extends BBServer {
  isUpgrading: boolean = false;
  isMaxed: boolean = false;
  nextRamUpgrade: number = 0;
  shortName: string = "";
  status: PlayerServerStatusType = "NONE";
  constructor(ns: NS, name: string) {
    super(ns, name);
  }

  static maxAffordableRam(ns: NS) {
    const money = ns.getServerMoneyAvailable("home");
    let ram = 4;
    while (ns.getPurchasedServerCost(ram) <= money) {
      ram *= 4;
    }
    return ram / 4;
  }

  setToUpgrade(value: number) {
    // If the value is not a power of 4, round it down to the last power of 4
    this.refresh();
    const pow = Math.floor(Math.log(value) / Math.log(4));
    this.nextRamUpgrade = Math.pow(4, pow);
    if (this.obj.maxRam < this.nextRamUpgrade) this.isUpgrading = true;
    else {
      this.isUpgrading = false;
      this.nextRamUpgrade = 0;
    }
  }

  canAffordUpgrade(value: number | null = null): boolean {
    const cost = this.ns.getPurchasedServerCost(value || this.nextRamUpgrade);
    return cost <= this.ns.getServerMoneyAvailable("home");
  }

  upgradeServer() {
    if (!this.isUpgrading) return;
    if (this.obj.maxRam >= this.nextRamUpgrade) {
      this.isUpgrading = false;
      return;
    }

    if (!this.canAffordUpgrade()) return;

    this.ns.killall(this.name);
    this.ns.deleteServer(this.name);

    const uuid = createUUID();
    const shortId = uuid.split("-")[0];
    const name = `pserv-${this.nextRamUpgrade}-${uuid}`;

    const result = this.ns.purchaseServer(this.name, this.nextRamUpgrade);

    if (result !== "") {
      this.name = name;
      this.shortName = shortId;
    }
  }
}
