import { NS } from "@ns";

// Meant to be extended
export default class Singleton {
  constructor(ns: NS) {
    // See if an instance of this file is already running
    // If so, kill those instances
    const thisScript = ns.getScriptName();
    const runningScripts = ns.ps("home");
    const existingInstances = runningScripts.filter(
      (script) => script.filename === thisScript && script.pid !== ns.pid
    );
    if (existingInstances.length == 0) {
      return;
    }

    console.debug(
      `[Singleton] Killing ${existingInstances.length} existing instance${
        existingInstances.length > 1 ? "s" : ""
      } of ${thisScript}`
    );
    existingInstances.forEach((script) => ns.kill(script.pid));
  }
}
