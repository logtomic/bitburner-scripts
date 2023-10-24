import { NS } from "@ns";

export default function depthFirstSearch(
  ns: NS,
  onPair: Function | null = (child: string, parent: string) => {},
  onItself: Function | null = (server: string) => {}
) {
  const search = (server: string, parent: string) => {
    ns.scan(server).forEach((child) => {
      if (child != parent) {
        typeof onPair === "function" && onPair(child, server);
        search(child, server);
      } else {
        typeof onItself === "function" && onItself(server);
      }
    });
  };
  search("home", "home");
}
