/**
 * Simple event queue for event handlers which need to call netscript functions
 *
 * @example
 * // Render custom modal
 * renderCustomModal(ns,
 *   <div>
 *     <button onClick={eventQueue.wrap(event => ns.killall())}>Kill all scripts</button>
 *   </div>
 * );
 * // Execute all events which have been triggered since last invocation of executeEvents
 * await eventQueue.executeEvents();
 */
export default class EventHandlerQueue {
  private queue: (() => void | Promise<unknown>)[] = [];

  public wrap<T extends (...args: any[]) => any>(fn: T) {
    return (...args: Parameters<T>) => {
      if (
        args[0] &&
        typeof args[0] === "object" &&
        typeof args[0].persist === "function"
      ) {
        args[0].persist();
      }
      this.queue.push(() => fn(...args));
    };
  }

  public async executeEvents() {
    const events = this.queue;
    this.queue = [];
    for await (const event of events) {
      await event();
    }
  }
}
