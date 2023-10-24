import { NS } from "@ns";

import { localeHHMMSS } from "fs/lib/util/index";

const settings = {
  maxPlayerServers: 25,
  gbRamCost: 55000,
  maxGbRam: 1048576,
  minGbRam: 64,
  totalMoneyAllocation: 0.9,
  actions: {
    BUY: "buy",
    UPGRADE: "upgrade",
  },
};

function createUUID() {
  var dt = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      var r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    }
  );
  return uuid;
}

function getPurchasedServers(ns: NS) {
  let purchasedServers = ns.getPurchasedServers();
  if (purchasedServers.length) {
    purchasedServers.sort((a, b) => {
      const totalRamA = ns.getServerMaxRam(a);
      const totalRamB = ns.getServerMaxRam(b);

      if (totalRamA === totalRamB) {
        return ns.getServerMaxRam(a) - ns.getServerMaxRam(b);
      } else {
        return totalRamA - totalRamB;
      }
    });
  }

  return purchasedServers;
}

export async function main(ns: NS) {
  ns.disableLog("ALL");
  ns.print(`[${localeHHMMSS()}] Starting playerServers.js`);

  settings.maxGbRam = ns.getPurchasedServerMaxRam();
  settings.maxPlayerServers = ns.getPurchasedServerLimit();
  let hostname = ns.getHostname();

  if (hostname !== "home") {
    throw new DOMException("Run the script from home");
  }

  while (true) {
    let didChange = false;

    let purchasedServers = getPurchasedServers(ns);
    let targetRam = 0;

    let action =
      purchasedServers.length < settings.maxPlayerServers
        ? settings.actions.BUY
        : settings.actions.UPGRADE;
    if (action == settings.actions.BUY) {
      let smallestCurrentServer = purchasedServers.length
        ? ns.getServerMaxRam(purchasedServers[0])
        : 0;
      targetRam = Math.max(settings.minGbRam, smallestCurrentServer);

      if (targetRam === settings.minGbRam) {
        while (
          ns.getServerMoneyAvailable("home") * settings.totalMoneyAllocation >=
          ns.getPurchasedServerCost(targetRam) * settings.maxPlayerServers
        ) {
          targetRam *= 2;
        }

        targetRam /= 2;
      }

      targetRam = Math.max(settings.minGbRam, targetRam);
      targetRam = Math.min(targetRam, settings.maxGbRam);

      if (
        ns.getServerMoneyAvailable("home") * settings.totalMoneyAllocation >=
        ns.getPurchasedServerCost(targetRam)
      ) {
        let hostname = `pserv-${targetRam}-${createUUID()}`;
        hostname = ns.purchaseServer(hostname, targetRam);
        ns.print(`[${localeHHMMSS()}] Purchased ${hostname}`);
        didChange = true;
      }
    } else {
      let smallestCurrentServer = Math.max(
        ns.getServerMaxRam(purchasedServers[0]),
        ns.getServerUsedRam(purchasedServers[0]),
        settings.minGbRam
      );
      let biggestCurrentServer = Math.max(
        ns.getServerMaxRam(purchasedServers[purchasedServers.length - 1]),
        ns.getServerUsedRam(purchasedServers[purchasedServers.length - 1])
      );
      targetRam = biggestCurrentServer;

      if (smallestCurrentServer === settings.maxGbRam) {
        ns.print(`[${localeHHMMSS()}] All servers maxxed. Exiting.`);
        ns.exit();
        return;
      }

      if (smallestCurrentServer === biggestCurrentServer) {
        targetRam *= 4;
        while (
          ns.getServerMoneyAvailable("home") * settings.totalMoneyAllocation >=
          ns.getPurchasedServerCost(4 * targetRam)
        ) {
          targetRam *= 4;
        }
      }

      targetRam = Math.min(targetRam, settings.maxGbRam);

      purchasedServers = getPurchasedServers(ns);
      if (targetRam > ns.getServerMaxRam(purchasedServers[0])) {
        didChange = true;
        while (didChange) {
          didChange = false;
          purchasedServers = getPurchasedServers(ns);

          if (targetRam > ns.getServerMaxRam(purchasedServers[0])) {
            if (
              ns.getServerMoneyAvailable("home") *
                settings.totalMoneyAllocation >=
              ns.getPurchasedServerCost(targetRam)
            ) {
              let hostname = `pserv-${targetRam}-${createUUID()}`;

              ns.killall(purchasedServers[0]);
              await ns.sleep(10);
              const serverDeleted = ns.deleteServer(purchasedServers[0]);
              if (serverDeleted) {
                hostname = ns.purchaseServer(hostname, targetRam);

                if (hostname) {
                  ns.print(
                    `[${localeHHMMSS()}] Upgraded: ${
                      purchasedServers[0]
                    } into server: ${hostname} (${targetRam} GB)`
                  );
                  didChange = true;
                }
              }
            }
          }
        }
      }
    }

    if (!didChange) {
      ns.print(`Target RAM: ${targetRam}GB`);
      ns.print(
        `Cost of server at target RAM: ${ns.formatNumber(
          ns.getPurchasedServerCost(targetRam),
          3
        )}`
      );
      await ns.sleep(30000);
    }
  }
}
