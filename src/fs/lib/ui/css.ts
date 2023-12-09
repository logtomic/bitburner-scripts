// https://pastebin.com/Tfnumm2i

/**
 * Template-String function which does nothing else than concatenating all parts.
 * This function can be used in editors like VSCode to get syntax highlighting & more for inline CSS strings
 *
 * @example
 *
 * <style children={css`
 *     .myClass {
 *         color: red;
 *     }
 * `} />
 */
export default function css(
  parts: TemplateStringsArray,
  ...params: any[]
): string {
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    result += params[i - 1] + parts[i];
  }
  return result;
}
