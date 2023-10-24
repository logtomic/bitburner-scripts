import { NS } from "@ns";

export async function main(ns: NS) {
  const target: string = ns.args[0] as string;
  const threads: number = ns.args[1] as number;
  const delay: number = ns.args[2] as number;

  if (delay && delay > 0) {
    await ns.sleep(delay);
  }

  ns.print(`Starting operation: weaken on ${target} in ${threads} threads`);
  await ns.weaken(target, { threads, stock: true });
  ns.exit();
}
