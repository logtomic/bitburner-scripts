import { NS } from "@ns";

import { createBox, doc, slp, elemFromHTML } from "fs/lib/ui/box";
import executeCommand from "fs/bin/executeCommand";

Array.prototype.splitArrayBy = function () {
  const ata = [...arguments];
  if (!ata.length) return [this];

  const f = ata.shift();
  if (typeof f !== "function") throw new Error(`Received a non-function: ${f}`);

  const [a, b] = this.reduce(
    (c, x) => {
      c[1 - Number(Boolean(f(x)))].push(x);
      return c;
    },
    [[], []]
  );
  return [a, ...b.splitArrayBy(...ata)];
};

function getExtension(str: string) {
  // fancy & fast way of getting extension
  // https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript#:~:text=return%20fname.slice((fname.lastIndexOf(%22.%22)%20%2D%201%20%3E%3E%3E%200)%20%2B%202)%3B
  return str.includes(".")
    ? str.slice(((str.lastIndexOf(".") - 1) >>> 0) + 2)
    : str;
}

function getFilesAt(ns: NS, location = "home") {
  const [exeFiles, msgFiles, filesLeft] = ns.ls(location).splitArrayBy(
    (x: string) => getExtension(x) === "exe",
    (x: string) => ["msg", "lit"].includes(getExtension(x))
  );
  const filesObj = { exeFiles, msgFiles, root: {} };

  const recurse = (filesToSearch: string[], path = "") => {
    const [folderedFiles, txtFiles, scripts] = filesToSearch.splitArrayBy(
      (x: string) => x.includes("/"),
      (x: string) => getExtension(x) === "txt"
    );

    const obj: Record<string, any> = {
      _txtFiles: txtFiles.map((f: string) => {
        return { name: f, path: path + f };
      }),
      _scripts: scripts.map((f: string) => {
        return { name: f, path: path + f };
      }),
    };

    const folders = folderedFiles
      .map((f: string) => f.split("/")[0])
      .reduce((coll: string[], item: string) => {
        if (!coll.includes(item)) coll.push(item);
        return coll;
      }, []);
    folders.forEach((folder: string) => {
      let newFiles = folderedFiles
        .filter((x: string) => x.slice(0, folder.length + 1) == folder + "/")
        .map((file: string) => file.slice(folder.length + 1));
      obj[folder] = recurse(newFiles, path + folder + "/");
    });

    return obj;
  };

  filesObj.root = recurse(filesLeft);
  return filesObj;
}

function openFile(path: string) {
  const ext = getExtension(path);
  const nanoable = ["js", "script", "txt"].includes(ext);
  const catable = ["msg", "lit"].includes(ext);
  const method = nanoable ? "nano" : catable ? "cat" : null;

  if (method) {
    const cmd = `${nanoable ? "nano" : "cat"} ${path}`;
    executeCommand(cmd);
  }
}

function displayInTerminal(ns: NS) {
  const location = "home";
  const files = getFilesAt(ns, location);

  ns.tprint(`<span><<< ${location} >>></span>`);
  files.exeFiles.forEach((file: string) => {
    ns.tprint(`├- ${file}`);
  });
  ns.tprint("|");
  ns.tprint("|");
  files.msgFiles.forEach((file: string) => {
    ns.tprint(`├- ${file}`);
  });
  ns.tprint("|");
  ns.tprint("|");

  const recurse = (files: Record<string, any>, prefix = "") => {
    [files["_txtFiles"], files["_scripts"]].forEach((thing) => {
      thing.forEach(
        (
          file: Record<string, any>,
          idx: number,
          arr: Record<string, any>[]
        ) => {
          const lastItem = idx + 1 === arr.length;
          const noKeys = Object.keys(files).length == 2;
          ns.tprint(`${prefix}${lastItem && noKeys ? "└" : "├"}-${file.name}`);
        }
      );
    });
    Object.keys(files)
      .filter((k) => !["_txtFiles", "_scripts"].includes(k))
      .forEach((folder, idx, arr) => {
        const lastItem = idx + 1 === arr.length;
        ns.tprint(`${prefix}|`);
        ns.tprint(`${prefix}${lastItem ? "└" : "├"}---┬- /${folder}`);

        // lineElems.push(elemFromHTML(`<span style="white-space:pre">${prefix}|</span>`));
        // lineElems.push(elemFromHTML(`<span style="white-space:pre">${prefix}${lastItem ? "└" : "├"}---┬- /<span style="color:aqua">${folder}</span></span>`));
        recurse(files[folder], prefix + (lastItem ? "    " : "|   "));
      });
  };

  recurse(files.root);
}

async function displayAsBox(ns: NS) {
  let location = "home";
  let refresh = true;
  const portHacks = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "relaySMTP.exe",
  ];

  const box = createBox(
    "File System",
    `
    <div class="flex nogrow">
      <button id="fs-box-refresh">Refresh</button>
      <button>Sample Button</button>
      <button>Sample Button</button>
      <button>Sample Button</button>
    </div>
    <div style="display:flex;flex-direction:column;overflow-y:auto" id="fs-box-list"></div>
    <div class="flex nogrow">
      <button>Sample Button</button>
      <button>Sample Button</button>
      <button>Sample Button</button>
      <button>Sample Button</button>
    </div>`,
    "\ueaf7"
  );
  const textArea = box.querySelector("#fs-box-list");
  const refreshButton = box.querySelector("#fs-box-refresh");
  refreshButton.addEventListener("click", (e) => {
    e.preventDefault();
    refresh = true;
  });
  box.style.height = "50%";

  while (doc.body.contains(box)) {
    if (refresh) {
      refresh = false;
      const files = getFilesAt(ns, location);

      const lineElems = [];
      lineElems.push(elemFromHTML(`<span><<< ${location} >>></span>`));
      files.exeFiles.forEach((file) => {
        const color = portHacks.includes(file) ? "orangered" : "goldenrod";
        const itemLineElem = elemFromHTML(
          `<span>├- <span style="color:${color}">${file}</span></span>`
        );
        lineElems.push(itemLineElem);
      });
      lineElems.push(elemFromHTML("<span>|</span><span>|</span>"));
      files.msgFiles.forEach((file) => {
        const itemLineElem = elemFromHTML(
          `<span>├- <a style="cursor:pointer;color:blueviolet">${file}</a><span>`
        );
        itemLineElem.addEventListener("click", (e) => {
          e.preventDefault();
          openFile(file);
        });
        lineElems.push(itemLineElem);
      });
      lineElems.push(elemFromHTML("<span>|</span><span>|</span>"));

      const recurse = (files, prefix = "") => {
        [
          { items: files["_txtFiles"], color: "green" },
          { items: files["_scripts"], color: "yellow" },
        ].forEach((thing) => {
          thing.items.forEach((file, idx, arr) => {
            const lastItem = idx + 1 === arr.length;
            const noKeys = Object.keys(files).length == 2;
            const itemLineElem = elemFromHTML(
              `<span style="white-space:pre">${prefix}${
                lastItem && noKeys ? "└" : "├"
              }- <a style="cursor:pointer;color:${thing.color}">${
                file.name
              }</a><span>`
            );
            itemLineElem.addEventListener("click", (e) => {
              e.preventDefault();
              openFile(file.path);
            });
            lineElems.push(
              elemFromHTML(`<span style="white-space:pre">${prefix}|</span>`)
            );
            lineElems.push(itemLineElem);
          });
        });
        Object.keys(files)
          .filter((k) => !["_txtFiles", "_scripts"].includes(k))
          .forEach((folder, idx, arr) => {
            const lastItem = idx + 1 === arr.length;
            lineElems.push(
              elemFromHTML(`<span style="white-space:pre">${prefix}|</span>`)
            );
            lineElems.push(
              elemFromHTML(
                `<span style="white-space:pre">${prefix}${
                  lastItem ? "└" : "├"
                }---┬- /<span style="color:aqua">${folder}</span></span>`
              )
            );
            recurse(files[folder], prefix + (lastItem ? "    " : "|   "));
          });
      };

      recurse(files.root);

      textArea.replaceChildren(...lineElems);
      textArea.querySelectorAll("span").style = { "white-space": "pre" };
    }
    await slp(1000);
  }
}

async function displayFiles(ns, flags) {
  (await flags["d"]) ? displayAsBox(ns) : displayInTerminal(ns);
}

export async function main(ns) {
  const flags = ns.flags([["d", false]]);
  await displayFiles(ns, flags);
}
