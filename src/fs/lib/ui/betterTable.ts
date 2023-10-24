import { NS } from "@ns";

import { colored } from "fs/lib/util/index";

export const tableSymbols = {
  horizontal: "─", // U+2500
  horizontalDouble: "═",
  vertical: "│", // U+2502
  upLeft: "┌", //U+250C
  upRight: "┐", //U+2510
  downLeft: "└", //U+2514
  downRight: "┘", //U+2518
  verticalLeft: "├",
  verticalRight: "┤",
  verticalLeftDouble: "╞",
  verticalRightDouble: "╡",
  horizontalDown: "┴",
  horizontalUp: "┬",
  center: "┼",
  centerDouble: "╪",
  upLeftCurve: "╭",
  upRightCurve: "╮",
  downLeftCurve: "╰",
  downRightCurve: "╯",
  block: "█",
  rightBlock: "▐",
  leftBlock: "▌",
  downBlock: "▄",
};

type FieldType = string | number | boolean;
type AlignmentType = "left" | "right" | "center";

class Field {
  value: FieldType;
  alignment: AlignmentType;
  rawText: string;
  padding: Record<string, number> = {
    left: 1,
    right: 1,
  };
  color: string | null = null;

  constructor(value: FieldType, alignment: AlignmentType = "left") {
    this.value = value; // holds the actual value, retaining type
    this.alignment = alignment;
    this.rawText = value.toString(); // holds the raw text, without colors
  }

  changeColor(color: string | null) {
    // Add new color. Will have no color if null,
    // or if color is not found in the colors object.
    this.color = color;
  }

  toString(width: number) {
    let rawText = this.value.toString();
    let text = this.color ? colored(this.color, rawText) : rawText;
    let space = width + text.length - rawText.length;
    if (this.alignment === "left") {
      text = text.padStart(text.length + this.padding.left).padEnd(space);
    } else if (this.alignment === "right") {
      text = text.padEnd(text.length + this.padding.right).padStart(space);
    } else if (this.alignment === "center") {
      text = text.padStart((text.length + space) / 2).padEnd(space);
    }
    return text;
  }
}

class Row {
  index: number | null;
  data: Field[];
  constructor(index: number | null = null, data: FieldType[]) {
    this.index = index;
    this.data = data.map((item) => new Field(item));
  }
  static getTopBorder(columnWidths: number[]) {
    let border = "";
    border += tableSymbols.upLeft;
    columnWidths.forEach((width) => {
      border += tableSymbols.horizontal.repeat(width);
      border += tableSymbols.horizontalUp;
    });
    border = border.slice(0, -1);
    border += tableSymbols.upRight;
    return border;
  }

  static getMiddleBorder(columnWidths: number[]) {
    let border = "";
    border += tableSymbols.verticalLeft;
    columnWidths.forEach((width) => {
      border += tableSymbols.horizontal.repeat(width);
      border += tableSymbols.center;
    });
    border = border.slice(0, -1);
    border += tableSymbols.verticalRight;
    return border;
  }

  static getDoubleMiddleBorder(columnWidths: number[]) {
    let border = "";
    border += tableSymbols.verticalLeftDouble;
    columnWidths.forEach((width) => {
      border += tableSymbols.horizontalDouble.repeat(width);
      border += tableSymbols.centerDouble;
    });
    border = border.slice(0, -1);
    border += tableSymbols.verticalRightDouble;
    return border;
  }

  static getBottomBorder(columnWidths: number[]) {
    let border = "";
    border += tableSymbols.downLeft;
    columnWidths.forEach((width) => {
      border += tableSymbols.horizontal.repeat(width);
      border += tableSymbols.horizontalDown;
    });
    border = border.slice(0, -1);
    border += tableSymbols.downRight;
    return border;
  }

  toString(columnWidths: number[]) {
    let content = "";
    content += tableSymbols.vertical;
    this.data.forEach((field, idx) => {
      content += field.toString(columnWidths[idx]);
      content += tableSymbols.vertical;
    });

    return content;
  }
}

export default class Table {
  headers: Row | null = null;
  rows: Row[];
  columnCount: number;
  columnWidths: number[] = [];
  constructor(data: FieldType[][], topRowIsHeaders: boolean = false) {
    this.columnCount = Math.max(...data.map((row) => row.length));
    if (topRowIsHeaders) this.headers = new Row(null, data[0]);
    this.rows = data
      .slice(topRowIsHeaders ? 1 : 0)
      .map((row, idx) => new Row(idx, row));

    // Pad rows with empty fields to ensure all rows are the same length
    this.rows.forEach((row) => {
      while (row.data.length < this.columnCount) {
        row.data.push(new Field(""));
      }
    });
    if (this.headers != null) {
      while (this.headers.data.length < this.columnCount) {
        this.headers.data.push(new Field(""));
      }
    }

    this.__resize();
  }

  changePadding(left: number = 1, right: number = 1) {
    this.rows.forEach((row) => {
      row.data.forEach((field) => {
        field.padding.left = left;
        field.padding.right = right;
      });
    });
    if (this.headers != null) {
      this.headers.data.forEach((field) => {
        field.padding.left = left;
        field.padding.right = right;
      });
    }
    this.__resize();
  }

  changePaddingForColumn(
    columnIdx: number,
    left: number = 1,
    right: number = 1
  ) {
    if (columnIdx < 0 || columnIdx >= this.columnCount) return;
    this.rows.forEach((row) => {
      row.data[columnIdx].padding.left = left;
      row.data[columnIdx].padding.right = right;
    });
    if (this.headers != null) {
      this.headers.data[columnIdx].padding.left = left;
      this.headers.data[columnIdx].padding.right = right;
    }
    this.__resize();
  }

  changeAlignmentForHeaders(alignment: AlignmentType) {
    if (this.headers == null) return;
    this.headers.data.forEach((field) => {
      field.alignment = alignment;
    });
    // No need to resize, as alignment doesn't affect width
  }

  changeAlignmentForColumn(columnIdx: number, alignment: AlignmentType) {
    if (columnIdx < 0 || columnIdx >= this.columnCount) return;
    this.rows.forEach((row) => {
      row.data[columnIdx].alignment = alignment;
    });
    // No need to resize, as alignment doesn't affect width
  }

  changeHeaderColor(color: string) {
    if (this.headers == null) return;
    this.headers.data.forEach((field) => {
      field.changeColor(color);
    });
  }

  changeColorForColumn(
    columnIdx: number,
    color: string,
    onlyIf: Function = () => true
  ) {
    if (columnIdx < 0 || columnIdx >= this.columnCount) return;
    this.rows.forEach((row) => {
      if (onlyIf(row.data[columnIdx].value)) {
        row.data[columnIdx].changeColor(color);
      }
    });
  }

  changeColorForRow(
    rowIdx: number,
    color: string,
    onlyIf: Function = () => true
  ) {
    if (rowIdx < 0 || rowIdx >= this.rows.length) return;
    this.rows[rowIdx].data.forEach((field) => {
      if (onlyIf(field.value)) {
        field.changeColor(color);
      }
    });
  }

  changeColorForCell(
    columnIdx: number,
    rowIdx: number,
    color: string,
    onlyIf: Function = () => true
  ) {
    if (
      rowIdx < 0 ||
      rowIdx >= this.rows.length ||
      columnIdx < 0 ||
      columnIdx >= this.columnCount
    )
      return;
    if (onlyIf(this.rows[rowIdx].data[columnIdx].value)) {
      this.rows[rowIdx].data[columnIdx].changeColor(color);
    }
  }

  changeColorForAll(color: string, onlyIf: Function = () => true) {
    this.rows.forEach((row) => {
      row.data.forEach((field) => {
        if (onlyIf(field.value)) {
          field.changeColor(color);
        }
      });
    });
  }

  getCellValue(columnIdx: number, rowIdx: number) {
    if (
      rowIdx < 0 ||
      rowIdx >= this.rows.length ||
      columnIdx < 0 ||
      columnIdx >= this.columnCount
    )
      return null;
    return this.rows[rowIdx].data[columnIdx].value;
  }

  __resize() {
    // Get the widths of each column from the rows
    this.rows.forEach((row) => {
      row.data.forEach((field, idx) => {
        const width =
          field.rawText.length + field.padding.left + field.padding.right;
        if (this.columnWidths[idx] == null || width > this.columnWidths[idx]) {
          this.columnWidths[idx] = width;
        }
      });
      if (this.headers != null) {
        this.headers.data.forEach((field, idx) => {
          const width =
            field.rawText.length + field.padding.left + field.padding.right;
          if (
            this.columnWidths[idx] == null ||
            width > this.columnWidths[idx]
          ) {
            this.columnWidths[idx] = width;
          }
        });
      }
    });
  }

  toString() {
    let table: string[] = [];
    table.push(Row.getTopBorder(this.columnWidths) + "\n");
    if (this.headers != null) {
      table.push(this.headers.toString(this.columnWidths) + "\n");
      table.push(Row.getDoubleMiddleBorder(this.columnWidths) + "\n");
    }
    this.rows.forEach((row) => {
      table.push(row.toString(this.columnWidths) + "\n");
      table.push(Row.getMiddleBorder(this.columnWidths) + "\n");
    });
    table.pop();
    table.push(Row.getBottomBorder(this.columnWidths));
    return table.join("");
  }
}

export async function main(ns: NS) {
  ns.clearLog();
  ns.tail();

  const myTable = [
    ["Name", "Email", "Age", "Has a Pet", "Extra Column"],
    ["Logan", "test@gmail.com", 26, true],
    ["Maria", "notAnEmail", 62, false, "Let's goooooooooooooooooooooooooooooo"],
    ["Jen", "jen@google.com", 36, true, "Yay"],
  ];

  const table = new Table(myTable, true);

  table.changeColorForColumn(3, "green", (val: boolean) => val === true);
  table.changeColorForColumn(3, "red", (val: boolean) => val === false);

  table.changeColorForColumn(1, "yellow", (val: string) => val.includes("@"));

  table.changeColorForRow(0, "cyan", (val: any) => typeof val === "number");

  table.changeColorForAll(
    "magenta",
    (val: any) => typeof val === "string" && val.includes("oo")
  );

  ns.print(table.toString());
}
