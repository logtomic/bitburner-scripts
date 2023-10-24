export default function slp(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
