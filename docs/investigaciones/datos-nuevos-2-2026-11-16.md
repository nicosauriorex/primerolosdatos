# Datos nuevos para la página: segunda investigación (2026-11-16)

Pedido del usuario: «manda a investigar si hay otra cosa interesante para mostrar. capaz hay cosas que va a haber que traer mas manual pero mientras pongamos la fuente esta bien». Sigue a `datos-nuevos-2026-11-16.md` (no repite lo de ahí). Lo hizo un subagente `investigador-datos`. La sesión principal todavía no lo verificó.

Referencias: [V] = API o descarga chica probada por el subagente; [B] = solo búsqueda o metadato; [NV] = no verificado.

## Ranking (valor × facilidad)

| # | Dato | Fuente e id/URL | Rango | Último | Dificultad | Estado |
|---|---|---|---|---|---|---|
| 1 | Subsidios económicos al transporte | API `452.2_TRANSPORTERTE_0_T_10_32` (Hacienda, base caja) | mensual 2016 → | sep-26 | baja | [V] |
| 2 | Transferencias corrientes a provincias (no automáticas) | API `452.2_TRANSFERENRAS_0_T_42_55` | mensual 2016 → | sep-26 | baja | [V] |
| 3 | Patentamientos de autos 0 km | datos.jus.gob.ar, dataset `1ab0cc03-ab9b-4520-975c-5757d87d1061` (ZIP con CSV por año, mes y provincia) | mensual 2000 → | oct-26 | baja-media | [V] |
| 4 | Femicidios | datos.jus.gob.ar, registro de la URSSF (Min. Justicia), dataset `27bb9b2c-521b-406c-bdf9-98110ef73f34` (caso a caso; se arma sobre todo con notas de medios: decirlo y contrastar con el SNIC «muertes violentas de mujeres») | 2014 → | NV | media | [V] cabecera |
| 5 | Gasto en becas | API `186.3_BECASCAS_0_0_5` | mensual 2004 → | oct-26 | baja | [V] |
| 6 | Demanda eléctrica total | API `367.3_DEMANDA_TOTAL__13` (ya en el semáforo, sin ficha propia); residencial `367.2_DEMANDA_REIAL__19` trimestral | mensual 2001 → | sep-26 | baja | [V] |
| 7 | Gasto nacional por finalidad (ciencia, salud, educación) y obra pública (inciso de bienes de uso, a confirmar) | ya procesado en `pipeline/gasto_nacion.py` | | NV | baja | falta mostrarlo |
| 8 | Muertes en siniestros viales | API `t_snic_3_victimas_arg`, `snic_3_hechos_arg` | anual 2000-2025 | 2025 | baja | [B] |
| 9 | Robos de autos y recuperos (DNRPA) | datos.jus.gob.ar, dataset `a9bdfec2-0af4-433a-b810-38c91275a251` (microdatos) | mensual 2022 → | sep-26 | media | [B] |
| 10 | Motos 0 km | datos.jus.gob.ar, `estadistica-de-tramites-de-motovehiculos` | NV | NV | baja-media | [B] |
| 11 | Ventas en autoservicios mayoristas | API `456.1_ALMACENCEN_0_M_7_96` y ramos `456.1_*` (venta a comercios, no consumo final) | mensual jul-17 → | ago-26 | baja | [V] |
| 12 | Gasto en seguro de desempleo | API `186.2_SEGURO_DESLEO_0_0_16` | trimestral 2004 → | jul-26 | baja | [V] |
| 13 | Ventas de utilitarios (ANIU) | API `38.3_ANIU_1994_M_27` (cámaras privadas: marcar) | mensual 1995 → | oct-26 | baja | [V] |
| 14 | Robos (tasa y cantidad) | API `snic_rt_arg`, `snic_rh_arg` | anual 2001-2022 | 2022 | baja | [B] |
| 15 | Vacunas: dosis aplicadas | Min. Salud, dataset `dosis-aplicadas-a-nivel-nacional` | NV | NV | media | [B] |
| 16 | Soja: hectáreas y rendimiento | API `AGRO_A_Soja_0002`, `_0004` | anual 1941 → 2024 | 2024 | baja | [B] |
| 17 | Remuneración por sector (SIPA) | datos.gob.ar, dataset de la SSPM (ids sin encontrar) | NV | NV | media | [B] |
| 18 | Empleadores (cierre de empresas) recientes | SRT (empleadores con ART) | NV | NV | media-alta | [NV] |

Sin fuente encontrada: remesas, emigración, alquileres de oferta, salario docente, quiebras, camas y médicos. Ya en el sitio: ICL, riesgo país, jubilación mínima con bono, petróleo, gas, supermercados.

## Notas
- Subsidios al transporte y transferencias a provincias son los más «calientes» (colectivos del AMBA, gobernadores): pesos corrientes, base caja; deflactar y en % del PIB. `378.9_GTOS_CAP_T017__27_37` no es obra pública (son transferencias de capital).
- Recomendación del subagente: empezar por 1, 2, 3, 6 y 7; después 4 (con la aclaración de la fuente) y 9.
