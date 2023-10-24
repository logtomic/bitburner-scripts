import React from "lib/react";
const { useState } = React;

export default function Button() {
  const [count, setCount] = useState(0);
  setTimeout(() => {
    setCount(count + 1);
  }, 1000);
  return <button onClick={() => console.log("Button!")}>Button!</button>;
}
