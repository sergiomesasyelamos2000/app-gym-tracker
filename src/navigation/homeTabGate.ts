/**
 * First-load Home gate: block switching away from Inicio until homeReady.
 */
export function shouldBlockHomeTabPress(
  routeName: string,
  homeReady: boolean
): boolean {
  return routeName !== "Inicio" && !homeReady;
}
