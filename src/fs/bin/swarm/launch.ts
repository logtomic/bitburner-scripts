import { NS } from "@ns";
import generateLaunchPlan, {
  CondensedLaunchType,
} from "fs/bin/swarm/generatePlan";

async function kickoffLaunch(
  ns: NS,
  targetServer: string,
  launchPlan: CondensedLaunchType[]
) {
  const actionLookup: Record<string, string> = {
    WEAKEN: "fs/bin/weaken.js",
    GROW: "fs/bin/grow.js",
    HACK: "fs/bin/hack.js",
  };

  const waitTime = ns.getWeakenTime(targetServer);

  // console.log(launchPlan);

  launchPlan.forEach((launch) => {
    const pid = ns.exec(
      actionLookup[launch.action],
      launch.serverName,
      launch.threads,
      targetServer,
      launch.threads
    );
    // console.log(`${pid} - ${launch.serverName} - ${launch.action}`);
  });

  await ns.sleep(waitTime + 2000);
}

export default async function launch(
  ns: NS,
  target = "",
  repetitions = 1,
  useHome = false
) {
  ns.disableLog("ALL");
  // get target if one isn't provided
  let targetServer; // = target === "" ? getTargets(ns, gameStage)[0].name : target;
  if (target === "" || target == null) {
    throw new Error("No target provided");
    // targetServer = getTargetBasedOnStage(ns, gameStage)[0].name;
    // ns.print(
    //   `Selecting '${targetServer}' as target for gameStage ${gameStage}`
    // );
  } else {
    targetServer = target;
  }

  let reps = repetitions == -1 ? 1e9 : repetitions;
  let numCompletedLaunches = 0;

  ns.print(
    `Starting launches against '${targetServer}' ${
      repetitions == -1 ? "infinitely" : `${reps} times...`
    }`
  );

  // ns.exec("fs/bin/servers/stageMonitor.js", "home", 1, targetServer);

  for (let i = 0; i < reps; i++) {
    const [launchPlan, stage, stoppedFromThreads, stoppedFromLackOfServers] =
      generateLaunchPlan(ns, targetServer, useHome);

    await kickoffLaunch(ns, targetServer, launchPlan);
    numCompletedLaunches += 1;
  }

  return [targetServer, numCompletedLaunches];
}

/** @param {NS} ns */
export async function main(ns: NS) {
  const flags = ns.flags([
    ["r", 1], // repetitions, use -1 for infinite
    ["h", false], // use half of home ram?
  ]);
  const flagArgs = flags._ as string[];
  const server = flagArgs.length ? flagArgs[0] : "";
  const repetitions =
    typeof flags["r"] == "number"
      ? Math.floor(flags["r"])
      : parseInt(flags["r"] as string);
  const useHome = flags["h"] as boolean;

  ns.exec("fs/bin/servers/stageMonitor.js", "home", 1, server);
  await launch(ns, server, repetitions, useHome);
}

export function autocomplete(data: any, args: any) {
  return data.servers;
}
