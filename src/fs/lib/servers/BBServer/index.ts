import { NS, Server } from "@ns";
import type { IndexableServer } from "/fs/lib/servers/BBServer/types";
import Threader from "/fs/lib/servers/BBServer/Threader";

type BBServerConfigType = {
  reservedRam: number;
  minRamForWorker: number;
};

export type { BBServer };
export default class BBServer {
  ns: NS;
  name: string;
  obj: IndexableServer;
  threader: Threader;
  private _config: BBServerConfigType = {
    reservedRam: 0,
    minRamForWorker: 4,
  };

  constructor(ns: NS, name: string) {
    this.ns = ns;
    this.name = name;
    this.obj = this._getStrongObj(ns, name);
    this.threader = new Threader(ns);
  }

  get config() {
    return this._config;
  }

  set config(config: Partial<BBServerConfigType>) {
    this._config = { ...this._config, ...config };
  }

  get availableRam() {
    return Math.max(
      this.obj.maxRam - this.obj.ramUsed - this._config.reservedRam,
      0
    );
  }

  get isHomeServer() {
    return this.obj.hostname === "home";
  }

  get isTargetServer() {
    return !this.isHomeServer && this.obj.moneyMax > 0;
  }

  get isHackableTargetServer() {
    return this.isTargetServer && this.obj.hasAdminRights;
  }

  get isWorkerServer() {
    const notHome = !this.isHomeServer;
    const a = this.obj.maxRam >= this._config.minRamForWorker;
    const b = this.obj.hasAdminRights;
    return notHome && a && b;
  }

  get isPurchasedServer() {
    return !this.isHomeServer && this.obj.purchasedByPlayer;
  }

  createMock(): IndexableServer {
    // Set mock to a deep copy of the server object.
    let mock = JSON.parse(JSON.stringify(this.obj));

    mock.hasAdminRights = true;
    mock.moneyAvailable = mock.moneyMax;
    mock.hackDifficulty = mock.minDifficulty;

    mock.ftpPortOpen = true;
    mock.httpPortOpen = true;
    mock.smtpPortOpen = true;
    mock.sqlPortOpen = true;
    mock.sshPortOpen = true;
    mock.openPortCount = 5;

    return mock;
  }

  /**
   *
   * @param ns The ns API object.
   * @param name The name of the server.
   * @returns A version of the Server object that is indexable and has all properties defined.
   */
  private _getStrongObj(ns: NS, name: string): IndexableServer {
    let s: Server = ns.getServer(name);
    return {
      backdoorInstalled: s.backdoorInstalled || false,
      baseDifficulty: s.baseDifficulty || 101,
      cpuCores: s.cpuCores || 0,
      ftpPortOpen: s.ftpPortOpen || false,
      hackDifficulty: s.hackDifficulty || 101,
      hasAdminRights: s.hasAdminRights || false,
      hostname: s.hostname || "",
      httpPortOpen: s.httpPortOpen || false,
      ip: s.ip || "",
      isConnectedTo: s.isConnectedTo || false,
      maxRam: s.maxRam || 0,
      minDifficulty: s.minDifficulty || 101,
      moneyAvailable: s.moneyAvailable || 0,
      moneyMax: s.moneyMax || 0,
      numOpenPortsRequired: s.numOpenPortsRequired || 0,
      openPortCount: s.openPortCount || 0,
      organizationName: s.organizationName || "",
      purchasedByPlayer: s.purchasedByPlayer || false,
      ramUsed: s.ramUsed || 0,
      requiredHackingSkill: s.requiredHackingSkill || 1e9,
      serverGrowth: s.serverGrowth || 0,
      smtpPortOpen: s.smtpPortOpen || false,
      sqlPortOpen: s.sqlPortOpen || false,
      sshPortOpen: s.sshPortOpen || false,
    };
  }

  /**
   * Refreshes the server object with the latest data.
   */
  refresh() {
    this.obj = this._getStrongObj(this.ns, this.name);
  }
}
