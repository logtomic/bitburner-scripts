import { NS } from "@ns";
import { getServerFlatMap } from "fs/bin/servers/getServerMap";

/**
 * Class responsible for most tasks related to servers.
 * Specifically, crawling, unlocking, mapping, and finding.
 */
export default class Spider {
  ns: NS;

  constructor(ns: NS) {
    this.ns = ns;
  }

  /**
   * @returns A list of all servers on the network.
   * @remark This will unlock all servers on the network, if possible.
   */
  getFlatMap() {
    return getServerFlatMap(this.ns);
  }

  /**
   * TODO: Implement this.
   * @param server The server to find a path to.
   * @returns A copy/paste string that will take you to a server.
   */
  find(server: string): string {
    let path = "connect home;";

    return path;
  }
}
