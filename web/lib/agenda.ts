// Agendar una fecha del calendario (docs/specs/ajustes-tanda-13.md, punto 5): link de Google Calendar y archivo .ics, sin dependencias.
// La hora del calendario del INDEC es hora argentina (America/Argentina/Buenos_Aires, UTC-3 todo el año, sin horario de verano).

export interface EventoAgenda {
  titulo: string;
  /** "AAAA-MM-DD". */
  fecha: string;
  /** "HH:MM" en hora argentina; null = evento de día completo. */
  hora: string | null;
  descripcion: string;
  /** Link a la ficha en el sitio (va en la descripción y como URL del evento). */
  url?: string;
  /** Duración en minutos de un evento con hora. */
  minutos?: number;
}

const DESFASE_ART_H = 3;   // UTC = hora argentina + 3
const p2 = (n: number) => String(n).padStart(2, "0");
const aUtc = (d: Date) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}00Z`;
const aDia = (d: Date) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}`;

/** Inicio y fin del evento: instantes UTC si tiene hora, o el día y el siguiente (fin exclusivo) si es de día completo. */
function rango(ev: EventoAgenda): { ini: string; fin: string } {
  const [a, m, d] = ev.fecha.split("-").map(Number);
  if (ev.hora && /^\d{1,2}:\d{2}$/.test(ev.hora)) {
    const [h, mi] = ev.hora.split(":").map(Number);
    const ini = new Date(Date.UTC(a, m - 1, d, h + DESFASE_ART_H, mi));
    return { ini: aUtc(ini), fin: aUtc(new Date(ini.getTime() + (ev.minutos ?? 30) * 60000)) };
  }
  return { ini: aDia(new Date(Date.UTC(a, m - 1, d))), fin: aDia(new Date(Date.UTC(a, m - 1, d + 1))) };
}

const detalles = (ev: EventoAgenda) => (ev.url ? `${ev.descripcion}\n${ev.url}` : ev.descripcion);

/** Link que abre Google Calendar con el evento cargado. */
export function linkGoogleCalendar(ev: EventoAgenda): string {
  const { ini, fin } = rango(ev);
  const q = new URLSearchParams({ action: "TEMPLATE", text: ev.titulo, dates: `${ini}/${fin}`, details: detalles(ev), ctz: "America/Argentina/Buenos_Aires" });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const escIcs = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Parte un renglón de más de 75 octetos en UTF-8 (RFC 5545), sin cortar un carácter: los siguientes empiezan con un espacio (que cuenta). */
const plegar = (l: string) => {
  const enc = new TextEncoder(), o: string[] = [];
  let actual = "", bytes = 0;
  for (const ch of l) {
    const n = enc.encode(ch).length, tope = o.length ? 74 : 75;
    if (bytes + n > tope) { o.push(actual); actual = ""; bytes = 0; }
    actual += ch; bytes += n;
  }
  o.push(actual);
  return o.map((x, i) => (i ? " " : "") + x).join("\r\n");
};
/** Hash corto (FNV-1a) del título y el link: dos datos del mismo día y hora con nombres parecidos no comparten UID. */
const hashCorto = (t: string) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

/** Texto del archivo .ics (un evento). `ahora` y `uid` se pueden fijar para probar. */
export function textoIcs(ev: EventoAgenda, ahora: Date = new Date(), uid?: string): string {
  const { ini, fin } = rango(ev), completo = !(ev.hora && /^\d{1,2}:\d{2}$/.test(ev.hora));
  const id = uid ?? `${ev.fecha}-${(ev.hora ?? "dia").replace(":", "")}-${hashCorto(ev.titulo + "|" + (ev.url ?? ""))}@primerolosdatos.com.ar`;
  const l = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Primero los Datos//Calendario//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${id}`, `DTSTAMP:${aUtc(ahora)}`,
    completo ? `DTSTART;VALUE=DATE:${ini}` : `DTSTART:${ini}`,
    completo ? `DTEND;VALUE=DATE:${fin}` : `DTEND:${fin}`,
    `SUMMARY:${escIcs(ev.titulo)}`, `DESCRIPTION:${escIcs(detalles(ev))}`,
    ...(ev.url ? [`URL:${ev.url}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ];
  return l.map(plegar).join("\r\n") + "\r\n";
}

/** Baja el .ics en el navegador (blob `text/calendar`). */
export function bajarIcs(ev: EventoAgenda, nombreArchivo: string): void {
  const url = URL.createObjectURL(new Blob([textoIcs(ev)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombreArchivo; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
