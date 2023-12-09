import { NS } from "@ns";
import {
  BBServer,
  IndexableServer,
} from "/fs/home/admin/ServerManager/BBServer";
import Button from "/fs/home/admin/ServerManager/Button";
import EventHandlerQueue from "/fs/home/admin/ServerManager/EventHandlerQueue";
const React = window.React;

interface ServerViewProps {
  ns: NS;
  server: BBServer | null;
  onBack: () => void;
  queue?: EventHandlerQueue;
}

export default function ServerView({
  ns,
  server,
  onBack,
  queue,
}: ServerViewProps) {
  const [serverState, setServerState] = React.useState<
    IndexableServer | undefined | null
  >(server?.obj);

  let refreshServer = () => {
    server?.refresh();
    setServerState(server?.obj);
  };

  if (queue) {
    refreshServer = queue.wrap(refreshServer);
  }

  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshServer();
    }, 1000);
    return () => clearInterval(interval);
  }, [serverState]);

  return (
    <div>
      <div>
        <Button text="Back" onClick={onBack} />
        <Button text="Refresh" onClick={refreshServer} />
      </div>
      {!server && <span>Server not found</span>}
      {server && (
        <div>
          <span>{server.name}</span>
          <p>
            {serverState ? JSON.stringify(serverState, null, 2) : "null object"}
          </p>
        </div>
      )}
    </div>
  );
}
