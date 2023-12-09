import { NS } from "@ns";
const React = window.React;

export default function Button({
  text,
  onClick,
  inverse,
  disable,
}: {
  text: string;
  onClick: () => void;
  inverse?: boolean;
  disable?: boolean;
}) {
  return (
    <button
      disabled={disable}
      style={{
        fontFamily:
          '"Lucida Console", "Lucida Sans Unicode", "Fira Mono", Consolas, "Courier New", Courier, monospace, "Times New Roman"',
        fontWeight: "400",
        backgroundColor: inverse ? "rgb(0, 204, 0)" : "black",
        color: inverse ? "black" : "rgb(0, 204, 0)",
        border: "1px solid rgb(0, 204, 0)",
        borderRadius: "0.25rem",
        margin: "0.25rem",
      }}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
