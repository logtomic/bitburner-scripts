import { NS } from "@ns";
import BBServerManager from "/fs/lib/servers/BBServerManager/index";
// import BBServerManager from "@lib/servers/BBServerManager/index";

export async function main(ns: NS) {
  ns.disableLog("ALL");
  ns.clearLog();
  ns.tail();

  const sm = new BBServerManager(ns, {
    useHome: true,
    reservedRamOnHome: 64,
  });
  const loops = 10;
  for (let i = 0; i < loops; i++) {
    sm.refresh();
    const targets = sm.scoreTargets();
    const launch = sm.generateLaunch(targets[0].server);
    ns.tprint(`Starting iteration ${i + 1}/${loops}`);
    await launch.start({
      iterations: 5,
    });
  }
}
