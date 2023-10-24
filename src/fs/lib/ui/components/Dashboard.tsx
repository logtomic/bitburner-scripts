import { NS } from "@ns";
import React from "lib/react";
import Button from "fs/lib/ui/components/Button";
const { useState } = React;

export default function Dashboard({ ns }: { ns: NS }) {
  const [count, setCount] = useState(0);
  const [result, setResult] = useState("");
  setTimeout(() => {
    setCount(count + 1);
  }, 1000);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const serverName = e.currentTarget.serverName.value;
    try {
      setResult(ns.getServerMaxMoney(serverName).toString());
    } catch (err) {
      setResult("Unable to get server max money for '" + serverName + "'.");
    }
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Coming soon!</p>
      <p>Count: {count}</p>
      <Button />
      <form onSubmit={(e) => handleSubmit(e)}>
        <label>
          <input type="text" name="serverName" />
        </label>
        <input type="submit" value="Submit" />
        <p>{result}</p>
      </form>
    </div>
  );
}
