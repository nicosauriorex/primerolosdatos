CREATE TABLE IF NOT EXISTS compartidos (
  id      TEXT PRIMARY KEY,   -- UUID del navegador; solo une el porqué con su acción
  creado  TEXT NOT NULL,      -- UTC redondeado a la hora: 2026-11-16T15:00Z
  accion  TEXT NOT NULL,      -- imagen_compartida | imagen_descargada | imagen_copiada | link_compartido | link_copiado | texto | tabla
  ruta    TEXT NOT NULL,      -- /dato/inflacion/
  vista   TEXT,               -- query del link compartido, sin «?» (dato, vista, período, moneda…)
  dato    TEXT,               -- id de serie o slug, si se conoce
  formato TEXT,               -- 1x1 | 4x5 | 16x9 (solo imágenes)
  celular INTEGER NOT NULL,   -- 1 si el ancho de pantalla es < 768 px
  porque  TEXT                -- bueno | malo | mejoro | empeoro | curiosidad | otro; NULL = sin respuesta
);
CREATE INDEX IF NOT EXISTS compartidos_creado ON compartidos (creado);
CREATE INDEX IF NOT EXISTS compartidos_dato ON compartidos (dato);
