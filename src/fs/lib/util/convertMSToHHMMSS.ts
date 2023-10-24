import { NS } from "@ns";

export default function convertMSToHHMMSS(ms = 0) {
  if (ms <= 0) {
    return "00:00:00";
  }

  if (!ms) {
    ms = new Date().getTime();
  }

  return new Date(ms).toISOString().substr(11, 8);
}
