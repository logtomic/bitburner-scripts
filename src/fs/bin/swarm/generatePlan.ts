import { NS } from "@ns";
import { getServerFlatMap } from "fs/bin/servers/getServerMap";
import { unlockServer } from "fs/bin/servers/unlock";
import generateThreads, {
  StageThreadsType,
} from "fs/bin/swarm/generateThreads";

export type LaunchType = {
  stage: number;
  action: string;
  server: string;
  threads: number;
};

export type CondensedLaunchType = {
  serverName: string;
  action: string;
  threads: number;
};

export default function generateLaunchPlan(
  ns: NS,
  target: string,
  useHome = false
): [CondensedLaunchType[], number, boolean, boolean] {
  let servers = getServers(ns, useHome);
  const threads = generateThreads(ns, target);

  const ramValues: Record<string, number> = {
    hack: ns.getScriptRam("fs/bin/hack.js", "home"),
    grow: ns.getScriptRam("fs/bin/grow.js", "home"),
    weaken: ns.getScriptRam("fs/bin/weaken.js", "home"),
  };

  let launchPlan: LaunchType[] = [];
  if (!(threads.stageOne.can && servers.length > 0))
    return [
      condenseLaunches(launchPlan),
      0,
      !threads.stageOne.can,
      servers.length == 0,
    ];

  // Stage 1
  const [stageOneLaunches, stageOneServers] = stageOne(
    servers,
    threads.stageOne,
    ramValues
  );
  launchPlan = launchPlan.concat(stageOneLaunches);
  if (!(threads.stageTwo.can && stageOneServers.length > 0))
    return [
      condenseLaunches(launchPlan),
      1,
      !threads.stageTwo.can,
      stageOneServers.length == 0,
    ];

  // Stage 2
  const [stageTwoLaunches, stageTwoServers] = stageTwo(
    stageOneServers,
    threads.stageTwo,
    ramValues
  );
  launchPlan = launchPlan.concat(stageTwoLaunches);
  if (!(threads.stageThree.can && stageTwoServers.length > 0))
    return [
      condenseLaunches(launchPlan),
      2,
      !threads.stageThree.can,
      stageTwoServers.length == 0,
    ];

  // Stage 3
  const [stageThreeLaunches, stageThreeServers] = stageThree(
    stageTwoServers,
    threads.stageThree,
    ramValues
  );
  launchPlan = launchPlan.concat(stageThreeLaunches);
  if (!(stageThreeServers.length > 0))
    return [
      condenseLaunches(launchPlan),
      3,
      false,
      stageThreeServers.length == 0,
    ];

  return [condenseLaunches(launchPlan), 4, false, false];
}

function getServers(ns: NS, includeHome = false) {
  const serverFlatMap = getServerFlatMap(ns, (server: string) => {
    unlockServer(ns, server);
    ns.scp(["weaken.js", "grow.js", "hack.js"], server, "home");
    return {
      hasRoot: ns.hasRootAccess(server),
      maxRam: ns.getServerMaxRam(server),
      usedRam: ns.getServerUsedRam(server),
    };
  });
  const sorted = serverFlatMap
    .filter((s) => s.maxRam > 0 && s.hasRoot)
    .sort((a, b) => b.maxRam - a.maxRam);
  if (includeHome) {
    sorted.unshift({
      name: "home",
      hasRoot: true,
      maxRam: (ns.getServerMaxRam("home") - ns.getServerUsedRam("home")) / 2,
      usedRam: 0,
    });
  }
  return sorted;
}

function condenseLaunches(launchDetails: LaunchType[]) {
  const condensed: CondensedLaunchType[] = [];
  const launchDetailsCopy = [...launchDetails];
  const serversUsed = launchDetailsCopy
    .map((server) => server.server)
    .filter((value, index, arr) => {
      return arr.indexOf(value) === index;
    });
  serversUsed.forEach((serverName) => {
    ["WEAKEN", "GROW", "HACK"].forEach((action) => {
      const totalActionThreads = launchDetailsCopy
        .filter((s) => s.server === serverName && s.action === action)
        .reduce((sum, s) => sum + s.threads, 0);
      if (totalActionThreads > 0) {
        condensed.push({
          serverName,
          action,
          threads: totalActionThreads,
        });
      }
    });
  });
  return condensed;
}

function stageOne(
  servers: Record<string, any>[],
  threads: StageThreadsType["stageOne"],
  ramValues: Record<string, number>
): [LaunchType[], Record<string, any>[]] {
  const additionalLaunches: LaunchType[] = [];
  while (servers.length > 0 && threads.weaken > 0) {
    const server = servers.shift();
    if (server == null) break;
    const threadsCapable = Math.floor(
      (server.maxRam - server.usedRam) / ramValues.weaken
    );

    if (threadsCapable == 0) {
      // may already be full. move onwards
      continue;
    }

    if (threadsCapable >= threads.weaken) {
      // server can take them all. Assign all to this one
      // plus, if it can take more, unshift.
      additionalLaunches.push({
        stage: 1,
        action: "WEAKEN",
        server: server.name,
        threads: threads.weaken,
      });
      server.usedRam += threads.weaken * ramValues.weaken;
      if (threadsCapable > threads.weaken) servers.unshift(server);
      threads.weaken = 0;
    } else if (threadsCapable < threads.weaken) {
      // server can only take some threads
      additionalLaunches.push({
        stage: 1,
        action: "WEAKEN",
        server: server.name,
        threads: threadsCapable,
      });
      server.usedRam += threadsCapable * ramValues.weaken;
      threads.weaken -= threadsCapable;
    }
  }
  return [additionalLaunches, servers];
}

function stageTwo(
  servers: Record<string, any>[],
  threads: StageThreadsType["stageTwo"],
  ramValues: Record<string, number>
): [LaunchType[], Record<string, any>[]] {
  const additionalLaunches: LaunchType[] = [];

  // should always be a 12:1 ratio, but just being safe
  let wThreadsThisChunk = Math.min(threads.weaken, 1);
  let gThreadsThisChunk = Math.min(
    threads.grow,
    threads.growsPerWeaken * wThreadsThisChunk
  );

  while (servers.length > 0 && threads.weaken + threads.grow > 0) {
    const overallRamCost =
      threads.weaken * ramValues.weaken + threads.grow * ramValues.grow;

    const server = servers.shift();
    if (server == null) break;
    let serverAvailableRam = server.maxRam - server.usedRam;
    const capableOfTakingWhatsLeft = serverAvailableRam > overallRamCost;

    // see if the server is able to take the whole thing
    // (makes endgame server launching easier)
    if (capableOfTakingWhatsLeft) {
      // give everything to this server and unshift
      additionalLaunches.push({
        stage: 2,
        action: "GROW",
        server: server.name,
        threads: threads.grow,
      });
      additionalLaunches.push({
        stage: 2,
        action: "WEAKEN",
        server: server.name,
        threads: threads.weaken,
      });
      server.usedRam +=
        threads.grow * ramValues.grow + threads.weaken * ramValues.weaken;
      threads.grow = 0;
      threads.weaken = 0;
      servers.unshift(server);
      continue;
    }

    // start with weaken threads, then move onto grow threads
    if (wThreadsThisChunk > 0) {
      const weakenThreadsCapable = Math.floor(
        serverAvailableRam / ramValues.weaken
      );
      if (weakenThreadsCapable == 0) {
        // may already be full. continue
        continue;
      } else {
        additionalLaunches.push({
          stage: 2,
          action: "WEAKEN",
          server: server.name,
          threads: wThreadsThisChunk,
        });
        server.usedRam += wThreadsThisChunk * ramValues.weaken;
        serverAvailableRam -= wThreadsThisChunk * ramValues.weaken;
        threads.weaken -= wThreadsThisChunk;
        wThreadsThisChunk = 0;
      }
    }

    if (gThreadsThisChunk > 0) {
      const growThreadsCapable = Math.floor(
        serverAvailableRam / ramValues.grow
      );
      if (growThreadsCapable == 0) {
        // may already be full. continue
        continue;
      }

      if (growThreadsCapable >= gThreadsThisChunk) {
        // server can take the remaining chunk. Assign to this one
        // plus, if it can take more, unshift.
        additionalLaunches.push({
          stage: 2,
          action: "GROW",
          server: server.name,
          threads: gThreadsThisChunk,
        });
        server.usedRam += gThreadsThisChunk * ramValues.grow;
        serverAvailableRam -= gThreadsThisChunk * ramValues.grow;
        if (growThreadsCapable > gThreadsThisChunk) servers.unshift(server);
        threads.grow -= gThreadsThisChunk;
        gThreadsThisChunk = 0;
      } else {
        // server can only take some of the chunk
        additionalLaunches.push({
          stage: 2,
          action: "GROW",
          server: server.name,
          threads: growThreadsCapable,
        });
        server.usedRam += growThreadsCapable * ramValues.grow;
        serverAvailableRam -= growThreadsCapable * ramValues.grow;
        threads.grow -= growThreadsCapable;
        gThreadsThisChunk -= growThreadsCapable;
      }
    }

    // reset chunks for next loop
    if (wThreadsThisChunk + gThreadsThisChunk == 0) {
      wThreadsThisChunk = Math.min(threads.weaken, 1);
      gThreadsThisChunk = Math.min(
        threads.grow,
        threads.growsPerWeaken * wThreadsThisChunk
      );
    }
  }

  return [additionalLaunches, servers];
}

function stageThree(
  servers: Record<string, any>[],
  threads: StageThreadsType["stageThree"],
  ramValues: Record<string, number>
): [LaunchType[], Record<string, any>[]] {
  const additionalLaunches: LaunchType[] = [];

  let hThreadsThisChunk = Math.min(threads.threadRatios[0], threads.hack);
  let gThreadsThisChunk = Math.min(threads.threadRatios[1], threads.grow);
  let wThreadsThisChunk = Math.min(threads.threadRatios[2], threads.weaken);

  while (
    servers.length > 0 &&
    threads.weaken + threads.grow + threads.hack > 0
  ) {
    const overallRamCost =
      threads.weaken * ramValues.weaken +
      threads.grow * ramValues.grow +
      threads.hack * ramValues.hack;

    const server = servers.shift();
    if (server == null) break;
    let serverAvailableRam = server.maxRam - server.usedRam;
    const capableOfTakingWhatsLeft = serverAvailableRam > overallRamCost;

    // see if the server is able to take the whole thing
    // (makes endgame server launching easier)
    if (capableOfTakingWhatsLeft) {
      // give everything to this server and unshift
      additionalLaunches.push({
        stage: 3,
        action: "HACK",
        server: server.name,
        threads: threads.hack,
      });
      additionalLaunches.push({
        stage: 3,
        action: "GROW",
        server: server.name,
        threads: threads.grow,
      });
      additionalLaunches.push({
        stage: 3,
        action: "WEAKEN",
        server: server.name,
        threads: threads.weaken,
      });
      server.usedRam +=
        threads.grow * ramValues.grow +
        threads.weaken * ramValues.weaken +
        threads.hack * ramValues.hack;
      threads.hack = 0;
      threads.grow = 0;
      threads.weaken = 0;
      servers.unshift(server);
      continue;
    }

    // start with weaken threads, then move onto grow threads
    if (wThreadsThisChunk > 0) {
      const weakenThreadsCapable = Math.floor(
        serverAvailableRam / ramValues.weaken
      );
      if (weakenThreadsCapable == 0) {
        // may already be full. continue
        continue;
      } else {
        additionalLaunches.push({
          stage: 3,
          action: "WEAKEN",
          server: server.name,
          threads: wThreadsThisChunk,
        });
        server.usedRam += wThreadsThisChunk * ramValues.weaken;
        serverAvailableRam -= wThreadsThisChunk * ramValues.weaken;
        threads.weaken -= wThreadsThisChunk;
        wThreadsThisChunk = 0;
      }
    }

    if (gThreadsThisChunk > 0) {
      const growThreadsCapable = Math.floor(
        serverAvailableRam / ramValues.grow
      );
      if (growThreadsCapable == 0) {
        // may already be full. continue
        continue;
      }

      if (growThreadsCapable >= gThreadsThisChunk) {
        // server can take the remaining chunk. Assign to this one
        // plus, if it can take more, unshift.
        additionalLaunches.push({
          stage: 3,
          action: "GROW",
          server: server.name,
          threads: gThreadsThisChunk,
        });
        server.usedRam += gThreadsThisChunk * ramValues.grow;
        serverAvailableRam -= gThreadsThisChunk * ramValues.grow;
        if (growThreadsCapable > gThreadsThisChunk) servers.unshift(server);
        threads.grow -= gThreadsThisChunk;
        gThreadsThisChunk = 0;
      } else {
        // server can only take some of the chunk
        additionalLaunches.push({
          stage: 3,
          action: "GROW",
          server: server.name,
          threads: growThreadsCapable,
        });
        server.usedRam += growThreadsCapable * ramValues.grow;
        serverAvailableRam -= growThreadsCapable * ramValues.grow;
        threads.grow -= growThreadsCapable;
        gThreadsThisChunk -= growThreadsCapable;
        continue;
      }
    }

    if (hThreadsThisChunk > 0) {
      const hackThreadsCapable = Math.floor(
        serverAvailableRam / ramValues.hack
      );
      if (hackThreadsCapable == 0) {
        // may already be full. continue
        continue;
      }

      if (hackThreadsCapable >= hThreadsThisChunk) {
        // server can take the remaining chunk. Assign to this one
        // plus, if it can take more, unshift.
        additionalLaunches.push({
          stage: 3,
          action: "HACK",
          server: server.name,
          threads: hThreadsThisChunk,
        });
        server.usedRam += hThreadsThisChunk * ramValues.hack;
        serverAvailableRam -= hThreadsThisChunk * ramValues.hack;
        if (hackThreadsCapable > hThreadsThisChunk) servers.unshift(server);
        threads.hack -= hThreadsThisChunk;
        hThreadsThisChunk = 0;
      } else {
        // server can only take some of the chunk
        additionalLaunches.push({
          stage: 3,
          action: "HACK",
          server: server.name,
          threads: hackThreadsCapable,
        });
        server.usedRam += hackThreadsCapable * ramValues.hack;
        serverAvailableRam -= hackThreadsCapable * ramValues.hack;
        threads.hack -= hackThreadsCapable;
        hThreadsThisChunk -= hackThreadsCapable;
        continue;
      }
    }

    // reset chunks for next loop
    hThreadsThisChunk = Math.min(threads.threadRatios[0], threads.hack);
    gThreadsThisChunk = Math.min(threads.threadRatios[1], threads.grow);
    wThreadsThisChunk = Math.min(threads.threadRatios[2], threads.weaken);
  }

  return [additionalLaunches, servers];
}
