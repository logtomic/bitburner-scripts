import { NS } from "@ns";

function localeHHMMSS(ms = 0) {
  if (!ms) {
    ms = new Date().getTime();
  }

  return new Date(ms).toLocaleTimeString();
}

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const threads = ns.args[1] as number;
  const delay = ns.args[2] as number;
  const tellTerminalOnSuccess = ns.args[3];

  if (delay && delay > 0) {
    await ns.sleep(delay);
  }

  ns.print(`Starting operation: hack on ${target} in ${threads} threads`);
  const hackedAmount = await ns.hack(target, { threads, stock: true });
  if (hackedAmount > 0 && tellTerminalOnSuccess) {
    const formattedAmount = ns.nFormat(hackedAmount, "$0.000a");
    ns.tprint(
      `[${localeHHMMSS()}] Successfully hacked ${target} for ${formattedAmount}`
    );
  }
  ns.exit();
}
