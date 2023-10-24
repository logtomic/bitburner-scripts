import { NS } from "@ns";

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const threads = ns.args[1] as number;
  const delay = ns.args[2] as number;

  if (delay && delay > 0) {
    await ns.sleep(delay);
  }

  ns.print(`Starting operation: grow on ${target} in ${threads} threads`);
  await ns.grow(target, { threads, stock: true });
  ns.exit();
}
