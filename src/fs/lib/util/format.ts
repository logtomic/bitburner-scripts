export function formatCurrency(value: number): string {
  const suffixes = ["", "k", "m", "b", "t"]; // add more suffixes as needed
  let suffixIndex = 0;
  let val = value;

  while (val >= 1000 && suffixIndex < suffixes.length - 1) {
    val /= 1000;
    suffixIndex++;
  }

  const formattedValue = val.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  const suffix = suffixes[suffixIndex];

  return `$${formattedValue}${suffix}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  let str = "";
  if (hours > 0) str += `${hours}h `;
  if (minutes > 0) str += `${minutes}m `;
  str += `${seconds.toFixed(0)}s`;
  return str;
}

export function formatNumber(value: number, places: number): string {
  return value.toFixed(places).replace(/\d(?=(\d{3})+$)/g, "$&,");
}
