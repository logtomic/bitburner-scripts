import { NS } from "@ns";

import BBServer from "/fs/lib/servers/BBServer/index";
import Hunter from "/fs/lib/servers/BBServerManager/Hunter";
import Spider from "/fs/lib/servers/BBServerManager/Spider";
import Launch from "/fs/lib/ingesters/Launch";
import Configurable from "/fs/lib/abstract/Configurable";

type ServerManagerConfigType = {
  useHome: boolean;
  reservedRamOnHome: number;
};

export default class BBServerManager extends Configurable<ServerManagerConfigType> {
  ns: NS;
  hunter: Hunter;
  spider: Spider;
  servers: BBServer[] = [];

  constructor(ns: NS, config: Partial<ServerManagerConfigType> = {}) {
    const defaultConfig: ServerManagerConfigType = {
      useHome: false,
      reservedRamOnHome: 0,
    };
    super({ ...defaultConfig, ...config });
    this.ns = ns;

    this.hunter = new Hunter(ns);
    this.spider = new Spider(ns);
    this.spider.getFlatMap().forEach((s) => {
      const server = new BBServer(ns, s.name);
      if (server != null) {
        this.servers.push(server);
      }
    });

    const homeServer = new BBServer(ns, "home");
    homeServer.config = {
      reservedRam: this._config.reservedRamOnHome,
    };
    this.servers.push(homeServer);
  }

  scoreTargets() {
    return this.hunter.scoreTargets(
      this.getTargetServers(),
      this.getWorkerServers()
    );
  }

  generateLaunch(target?: BBServer) {
    const workers = this.getWorkerServers();
    const t = target || this.getTargetServers()[0];
    return new Launch(this.ns, t, workers);
  }

  getHackableTargetServers() {
    return this.servers.filter((s) => s.isHackableTargetServer);
  }

  getTargetServers() {
    return this.servers.filter((s) => s.isTargetServer);
  }

  getTarget(name: string) {
    this.getTargetServers().find((s) => s.name === name);
  }

  getWorkerServers() {
    return this.servers.filter(
      (s) =>
        s.isWorkerServer ||
        s.isPurchasedServer ||
        (s.isHomeServer && this._config.useHome)
    );
  }

  getWorker(name: string) {
    this.getWorkerServers().find((s) => s.name === name);
  }

  getPurchasedServers() {
    return this.servers.filter((s) => s.isPurchasedServer);
  }

  getPurchasedServer(name: string) {
    this.getPurchasedServers().find((s) => s.name === name);
  }

  getHomeServer() {
    const h = this.servers.find((s) => s.isHomeServer) as BBServer;
    h.config = {
      reservedRam: this._config.reservedRamOnHome,
    };
    return h;
  }

  refresh() {
    this.servers.forEach((server) => server.refresh());
  }
}
