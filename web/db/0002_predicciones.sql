-- Predicciones de la gente (bloque 9c, docs/specs/predicciones.md). Sin IP, user agent ni cuentas.
CREATE TABLE IF NOT EXISTS predicciones (
  ronda    TEXT NOT NULL,     -- ipc-2026-11
  votante  TEXT NOT NULL,     -- UUID del navegador, uno por ronda
  valor    REAL NOT NULL,     -- % con un decimal, entre -5 y 30
  creado   TEXT NOT NULL,     -- UTC redondeado a la hora
  cambiado TEXT,              -- UTC redondeado a la hora, si se cambió
  celular  INTEGER NOT NULL,
  PRIMARY KEY (ronda, votante)
);
