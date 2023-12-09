import { NS } from "@ns";
const React = window.React;

import ServerTable from "fs/home/admin/ServerManager/ServerTable";
import BBServerManager from "fs/home/admin/ServerManager/BBServerManager";
import EventHandlerQueue from "fs/home/admin/ServerManager/EventHandlerQueue";

import renderCustomModal from "fs/lib/ui/components/CustomModal";

export async function main(ns: NS) {
  ns.clearLog();
  ns.disableLog("ALL");
  ns.tail();

  const sm = new BBServerManager(ns);
  const eventHQ = new EventHandlerQueue();

  renderCustomModal(
    ns,
    <ServerTable ns={ns} serverManager={sm} queue={eventHQ} />
  );

  const ping = 5;
  let refresh = 0;
  sm.refresh();
  while (true) {
    refresh += 1;
    refresh %= ping;
    if (refresh === 0) {
      sm.refresh();
    }
    await eventHQ.executeEvents();
    await ns.sleep(1000);
  }
}
