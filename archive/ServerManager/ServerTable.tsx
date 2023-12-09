import { NS } from "@ns";
import BBServerManager from "/fs/home/admin/ServerManager/BBServerManager";
import ServerView from "/fs/home/admin/ServerManager/ServerView";
import EventHandlerQueue from "/fs/home/admin/ServerManager/EventHandlerQueue";
import {
  PlayerServer,
  TargetServer,
  TaskServer,
} from "/fs/home/admin/ServerManager/BBServer";
import Button from "/fs/home/admin/ServerManager/Button";
import TargetTable from "/fs/home/admin/ServerManager/tables/TargetTable";
const React = window.React;

interface ServerTableProps {
  ns: NS;
  serverManager: BBServerManager;
  queue?: EventHandlerQueue;
}

const customMonitorStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  border: "1px solid #ccc",
  padding: "0.5rem",
};

export default function ServerTable({
  ns,
  serverManager,
  queue,
}: ServerTableProps) {
  const [page, setPage] = React.useState<
    "TARGETS" | "PLAYERSERVERS" | "TASKSERVERS"
  >("TARGETS");
  const [serverViewed, setServerViewed] = React.useState<string | null>(null);

  function viewServer(server: string | null = null) {
    const sv = server ? serverManager.getServer(server) : null;
    setServerViewed(sv ? sv.name : null);
  }

  return (
    <div id="custom-monitor" style={customMonitorStyle}>
      {serverViewed && (
        <div id="server-view">
          <ServerView
            ns={ns}
            server={serverManager.getServer(serverViewed)}
            onBack={() => viewServer(null)}
            queue={queue}
          />
        </div>
      )}
      {!serverViewed && (
        <div>
          <div id="page-buttons">
            <Button
              text="Targets"
              onClick={() => setPage("TARGETS")}
              inverse={page === "TARGETS"}
              disable={page === "TARGETS"}
            />
            <Button
              text="Player Servers"
              onClick={() => setPage("PLAYERSERVERS")}
              inverse={page === "PLAYERSERVERS"}
              disable={page === "PLAYERSERVERS"}
            />
            <Button
              text="Task Servers"
              onClick={() => setPage("TASKSERVERS")}
              inverse={page === "TASKSERVERS"}
              disable={page === "TASKSERVERS"}
            />
          </div>
          {page === "TARGETS" && (
            <TargetTable
              ns={ns}
              targetServers={serverManager.targetServers}
              onView={viewServer}
            />
          )}
          {page === "PLAYERSERVERS" && (
            <PlayerServerTable
              playerServers={serverManager.playerServers}
              onView={viewServer}
            />
          )}
          {page === "TASKSERVERS" && (
            <TaskServerTable
              taskServers={serverManager.taskServers}
              onView={viewServer}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PlayerServerTable({
  playerServers,
  onView,
}: {
  playerServers: Record<string, PlayerServer>;
  onView: (server: string | null) => void;
}) {
  return (
    <div>
      <span>Player Servers</span>
      <ul>
        {Object.entries(playerServers).map(([name, server]) => {
          return (
            <li onClick={() => onView(name)} key={name}>
              {name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TaskServerTable({
  taskServers,
  onView,
}: {
  taskServers: Record<string, TaskServer>;
  onView: (server: string | null) => void;
}) {
  return (
    <div>
      <span>Task Servers</span>
      <ul>
        {Object.entries(taskServers)
          .sort((a, b) => {
            const aRam = a[1].obj?.maxRam || 0;
            const bRam = b[1].obj?.maxRam || 0;
            return bRam - aRam;
          })
          .map(([name, server]) => {
            return (
              <li onClick={() => onView(name)} key={name}>
                {name} - {server.obj?.maxRam}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
