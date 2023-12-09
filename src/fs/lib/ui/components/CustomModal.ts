// https://pastebin.com/Tfnumm2i
import { NS } from "@ns";

/** Alias for document to prevent excessive RAM use */
const doc = eval("document") as Document;

/**
 * Returns the full command line for the current process, which is also the title of the tail modal
 */
export function getCommandLine(ns: NS) {
  return ns.getScriptName() + " " + ns.args.join(" ");
}

/**
 * Tries to find the tail modal for this process
 */
export function getTailModal(ns: NS) {
  const commandLine = getCommandLine(ns);
  const modals = doc.querySelectorAll(`.drag > h6`);
  const tailTitleEl = Array.from(modals).find((x) =>
    x.textContent!.includes(commandLine)
  );
  // console.log(tailTitleEl?.parentElement!.parentElement!.children[1]);
  return tailTitleEl?.parentElement!.parentElement!.children[1];
}

/**
 * Creates a custom container inside a tail modal to use for rendering custom DOM.
 * If the container has already been created, the existing container will be returned.
 */
export function getCustomModalContainer(ns: NS): HTMLDivElement | undefined {
  const id = getCommandLine(ns).replace(/[^\w\.]/g, "_");
  let containerEl = doc.getElementById(id) as HTMLDivElement | null;
  if (!containerEl) {
    const modalEl = getTailModal(ns);
    if (!modalEl) {
      return undefined;
    }
    containerEl = doc.createElement("div");
    containerEl.id = id;
    containerEl.style.fontFamily =
      '"Lucida Console", "Lucida Sans Unicode", "Fira Mono", Consolas, "Courier New", Courier, monospace, "Times New Roman"';
    containerEl.style.fontWeight = "400";
    containerEl.style.position = "absolute";
    containerEl.style.overflow = "auto";
    containerEl.style.left = "0";
    containerEl.style.right = "0";
    containerEl.style.top = "34px";
    containerEl.style.bottom = "0";
    containerEl.style.background = "black";
    containerEl.style.color = "rgb(0, 204, 0)";
    modalEl.insertBefore(containerEl, modalEl.firstChild);
  }
  return containerEl;
}

/**
 * Render a custom modal with react
 *
 * @example
 * renderCustomModal(ns,
 *   <div>
 *     Hello world!
 *   </div>
 * );
 */
export default function renderCustomModal(ns: NS, element: React.ReactElement) {
  const container = getCustomModalContainer(ns);
  if (!container) {
    return;
  }
  window.ReactDOM.render(element, container);
}
