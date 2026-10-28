/**
 * Times as the kitchen reads them. The zone is fixed so the server (UTC on Vercel) and the phone
 * render the same text; Elúa's zone is UTC−6 all year. 24-hour times avoid "p.m." vs "p. m."
 * differences between the server's and the browser's formatting data.
 */
export const KITCHEN_TIME_ZONE = "America/Mexico_City";

const time = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: KITCHEN_TIME_ZONE });
const date = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: KITCHEN_TIME_ZONE });
const dayAndTime = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: KITCHEN_TIME_ZONE });

/** "22:16" */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** "24 oct 2026" */
export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}

/** "27 de octubre a las 22:16" */
export function formatDayAndTime(iso: string): string {
  return `${dayAndTime.format(new Date(iso))} a las ${formatTime(iso)}`;
}
