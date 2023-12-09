import { NS } from "@ns";

import { TargetServer } from "/fs/home/admin/ServerManager/BBServer";
import {
  formatCurrency,
  formatTime,
  formatNumber,
  formatPercent,
} from "/fs/lib/util/format";

import css from "/fs/lib/ui/css";

const React = window.React;

// const tableStyle = css`
//   table,
//   th,
//   td {
//     border-collapse: collapse;
//     border: 1px solid grey;
//   }
// `;

type TableSort =
  | "serverName"
  | "moneyMax"
  | "weakenTime"
  | "estHackTime"
  | "securityDiff"
  | "estHackChance"
  | "estProfit/Sec";

export default function TargetTable({
  ns,
  targetServers,
  onView,
}: {
  ns: NS;
  targetServers: Record<string, TargetServer>;
  onView: (server: string | null) => void;
}) {
  const [tableSort, setTableSort] = React.useState<TableSort>("serverName");
  const [tableSortDirection, setTableSortDirection] = React.useState<
    "ASC" | "DESC"
  >("ASC");
  const sortFunctions: Record<
    string,
    (a: [string, TargetServer], b: [string, TargetServer]) => number
  > = {
    serverName: (a: [string, TargetServer], b: [string, TargetServer]) =>
      (tableSortDirection === "ASC" ? 1 : -1) * a[0].localeCompare(b[0]),
    moneyMax: (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aMoneyMax = a[1].obj?.moneyMax ?? 0;
      const bMoneyMax = b[1].obj?.moneyMax ?? 0;
      return (tableSortDirection === "ASC" ? 1 : -1) * (bMoneyMax - aMoneyMax);
    },
    weakenTime: (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aWeakenTime = a[1].profitInfo.weakenTime;
      const bWeakenTime = b[1].profitInfo.weakenTime;
      return (
        (tableSortDirection === "ASC" ? 1 : -1) * (bWeakenTime - aWeakenTime)
      );
    },
    estHackTime: (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aEstHackTime = a[1].profitInfo.bestWeakenTime;
      const bEstHackTime = b[1].profitInfo.bestWeakenTime;
      return (
        (tableSortDirection === "ASC" ? 1 : -1) * (bEstHackTime - aEstHackTime)
      );
    },
    securityDiff: (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aSecurityDiff = a[1].profitInfo.securityDiff ?? 0;
      const bSecurityDiff = b[1].profitInfo.securityDiff ?? 0;
      return (
        (tableSortDirection === "ASC" ? 1 : -1) *
        (aSecurityDiff - bSecurityDiff)
      );
    },
    estHackChance: (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aEstHackChance = a[1].profitInfo.estimatedHackChance;
      const bEstHackChance = b[1].profitInfo.estimatedHackChance;
      return (
        (tableSortDirection === "ASC" ? 1 : -1) *
        (bEstHackChance - aEstHackChance)
      );
    },
    "estProfit/Sec": (a: [string, TargetServer], b: [string, TargetServer]) => {
      const aEstProfit = a[1].profitInfo.estimatedProfit;
      const bEstProfit = b[1].profitInfo.estimatedProfit;
      return (
        (tableSortDirection === "ASC" ? 1 : -1) * (bEstProfit - aEstProfit)
      );
    },
  };
  function setSort(sort: TableSort) {
    if (tableSort === sort) {
      setTableSortDirection(tableSortDirection === "ASC" ? "DESC" : "ASC");
    } else {
      setTableSort(sort);
      setTableSortDirection("ASC");
    }
  }
  return (
    <div>
      <span>Target Servers</span>
      <table>
        {/* <style children={tableStyle} /> */}
        <thead>
          {[
            ["serverName", "Server"],
            ["moneyMax", "Max $"],
            ["weakenTime", "W Time"],
            ["estHackTime", "Est Hack Time"],
            ["securityDiff", "Sec Diff"],
            ["estHackChance", "Est Hack Chance"],
            ["estProfit/Sec", "Est Profit/Sec"],
          ].map(([sort, name]) => {
            return <th onClick={() => setSort(sort as TableSort)}>{name}</th>;
          })}
        </thead>
        <tbody>
          {Object.entries(targetServers)
            .sort(sortFunctions[tableSort])
            .map(([name, server]) => {
              return (
                <tr>
                  <td onClick={() => onView(name)}>{name}</td>
                  <td>{formatCurrency(server.obj?.moneyMax ?? 0)}</td>
                  <td>{formatTime(server.profitInfo.weakenTime / 1000)}</td>
                  <td>{formatTime(server.profitInfo.bestWeakenTime / 1000)}</td>
                  <td>
                    {formatNumber(server.profitInfo.securityDiff ?? 0, 1)}
                  </td>
                  <td>
                    {formatPercent(server.profitInfo.estimatedHackChance)}
                  </td>
                  <td>
                    {formatCurrency(server.profitInfo.estimatedProfit * 1000)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
