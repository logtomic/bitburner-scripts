import { NS } from "@ns";

// Credit: jjclark1982
// Link: https://raw.githubusercontent.com/jjclark1982/bitburner-scripts/main/lib/box-drawing.js
// I took this directly and made no changes.

export async function main(ns: NS) {
  // Print an example table to demonstrate functionality.
  const columns = [
    { header: "Name ", field: "name", align: "center" },
    { header: "Count", field: "count" },
    { header: "Status", field: "status", align: "left", truncate: true },
    { header: "Time       ", field: "time", format: drawTable.time },
  ];
  const rows = [
    { name: "A", count: 2 },
    { name: "B", count: 10 },
    { name: "C", status: "idle" },
    { name: "D", time: Date.now() },
    { name: "E", status: "longer_status" },
  ];
  const title = "Example Table";
  ns.tprint("\n" + drawTable(title, columns, rows));
}

/*
columns: {width, header, field, format, align, truncate}
rows: obj with each [field]
*/
export function drawTable(
  title: string | null = null,
  columns: Record<string, any>[],
  ...rowsets: Record<string, any>[][]
) {
  let totalWidth = 3 * columns.length + 1;
  for (const col of columns) {
    col.width ||= col.header.length;
    totalWidth += col.width;
  }

  let lines = [];

  if (title != null) {
    lines.push(" ");
    lines.push(pad(title, totalWidth, " ", "center"));
  }

  lines.push(drawHR(columns, ["┌", "┬", "─", "┐"]));
  lines.push(
    "│ " +
      columns
        .map((col) =>
          pad(col.header || col.field, col.width, " ", col.align || "left")
        )
        .join(" │ ") +
      " │"
  );

  for (const rows of rowsets) {
    lines.push(drawHR(columns, ["├", "┼", "─", "┤"]));

    for (const row of rows) {
      const values = [];
      for (const col of columns) {
        // Typing here is awful, but works for now
        let val: Record<string, any> | string = getField(row, col.field);
        if (Array.isArray(col.field)) {
          val = col.field.map((f) => getField(row, f));
        }
        if (Array.isArray(col.format)) {
          const vals = (val || []).map((v: any) =>
            col.format[0](v, ...(col.formatArgs || []))
          );
          val = formatFraction(vals, col.itemWidth);
        } else if (typeof col.format == "function") {
          if (!Number.isNaN(val)) {
            val = col.format(val, ...(col.formatArgs || []));
          }
        }
        let str = pad(`${val || ""}`, col.width, " ", col.align || "right");
        if (col.truncate && str.length > col.width) {
          str = str.substring(0, col.width - 1) + "…";
        }
        values.push(str);
      }
      lines.push("│ " + values.join(" │ ") + " │");
    }
  }

  lines.push(drawHR(columns, ["└", "┴", "─", "┘"]));
  return lines.join("\n");
}

function drawHR(columns: Record<string, any>[], glyphs = ["└", "┴", "─", "┘"]) {
  let line = glyphs[0];
  const segments = [];
  for (const col of columns) {
    const segment = pad("", col.width + 2, glyphs[2]);
    segments.push(segment);
  }
  line = glyphs[0] + segments.join(glyphs[1]) + glyphs[3];
  return line;
}

function pad(str: string, length: number, filler = " ", align = "right") {
  if (align == "right") {
    while (str.length < length) {
      str = filler + str;
    }
  } else if (align == "left") {
    while (str.length < length) {
      str = str + filler;
    }
  } else {
    while (str.length < length) {
      str = str + filler;
      if (str.length < length) {
        str = filler + str;
      }
    }
  }
  return str;
}

function getField(obj: Record<string, any>, fieldName: string) {
  let cursor = obj;
  for (const part of `${fieldName || ""}`.split(".")) {
    cursor = cursor[part];
  }
  return cursor;
}

export function formatTime(timeMS: number, precision = 0) {
  if (!timeMS) {
    return "";
  }
  let sign = "";
  if (timeMS < 0) {
    sign = "-";
    timeMS = Math.abs(timeMS);
  }
  const d = new Date(2000, 1, 1, 0, 0, timeMS / 1000);
  let timeStr = d.toTimeString().slice(0, 8);
  if (timeMS >= 60 * 60 * 1000) {
    timeStr = timeStr.slice(0, 8);
  } else if (timeMS >= 10 * 60 * 1000) {
    timeStr = timeStr.slice(3, 8);
  } else {
    timeStr = timeStr.slice(4, 8);
  }
  if (precision > 0) {
    let msStr = (timeMS / 1000 - Math.floor(timeMS / 1000)).toFixed(precision);
    timeStr += msStr.substring(1);
  }
  return sign + timeStr;
}
drawTable.time = formatTime;

export function formatFraction(fraction: string[], itemWidth = 0) {
  const values = fraction
    .filter((val: string) => !!val)
    .map((val: string) => pad(val, itemWidth));
  return values.join(" / ");
}
drawTable.fraction = formatFraction;
