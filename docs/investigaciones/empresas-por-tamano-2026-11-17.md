# Empresas por tamaño: ¿las que cierran son chicas? (2026-11-17)

Pedido del usuario: «fijate si tenemos empleados por empresa. porque a veces cierran empresas (cuits) con 1 solo empleado o sin. y se usa eso para decir que cierran empresas. o como lo podemos contrastar». Lo investigó un subagente `investigador-datos` (todo bajado y leído); la sesión principal recalculó la tabla de la SRT.

## Fuentes
| Fuente | Qué trae | Rango | URL |
|---|---|---|---|
| SRT, serie histórica según tamaño de la nómina | Cuadro 4.2: empleadores por tramo (1, 2, 3 a 5, 6 a 10, 11 a 25, 26 a 40, 41 a 50, 51 a 100, 101 a 500, 501 a 1500, 1501 a 2500, 2501 a 5000, más de 5000); Cuadro 4.1: trabajadores cubiertos por tramo | mensual jul-96 → ago-26 | `https://www.srt.gob.ar/estadisticas/series/co/up/Serie_historica_Segun_Tama%C3%B1o_de_la_nomina_del_empleador%20-%20UP.xlsx` (si cambia: en `cf_serie_historica_up.php`, el href con «Tama» y «nomina») |
| SRT, cuadro 1.1 | trabajadores en unidades productivas (9.857.173 nov-23; 9.389.184 ago-26) | mensual | el xlsx que ya usa `pipeline/trabajo_obra.py` |
| OEDE (Secretaría de Trabajo), flujos de creación y destrucción de empleo | T4/T5: aperturas, cierres y stock de empresas; T1/T2: puestos creados y destruidos por aperturas, cierres, expansión y contracción | trimestral 2T-96 → 1T-26 | `https://www.argentina.gob.ar/sites/default/files/flujos_de_creacion_y_destruccion_de_empleo_3.xlsx` (el número cambia: buscar `flujos_de_creacion_y_destruccion_de_empleo_*.xlsx` en la página del OEDE, con User-Agent de navegador) |
| OEDE, serie de empresas | C 6: empresas privadas por tamaño (micro, pequeña, mediana, grande; y por tramo de empleo) | anual 1996 → 2024 | `nacional_serie_empresas_*.xlsx` |

## Resultado (SRT, nov-23 → ago-26)
- Empleadores: −32.429. De 1 trabajador: −15.824 (48,8 %); de 1 a 5: −26.808 (82,7 %); de 1 a 10: −29.747 (91,7 %); de más de 50: −708 (2,2 %).
- Trabajadores cubiertos: −467.989. En empresas de 1 a 5: −44.866 (9,6 %); en las de 501 o más: −275.405 (58,8 %), de las cuales el tramo de más de 5000 explica −201.243 (14 empleadores menos; incluye 43.426 trabajadores de Chubut que dejaron de figurar con ART en nov-25: cambio de cobertura, no despidos).
- Son variaciones netas por tramo: una empresa que achica pasa a un tramo menor. El número de 1 a 5 es un techo de los cierres chicos, no un conteo de cierres.

## Resultado (OEDE)
- Puestos por empresa cerrada: 2,2 a 2,6 por trimestre (1T-26: 18.013 cierres, 43.458 puestos). Empresa promedio: 12,3 puestos.
- 1T-26: 42.381 puestos perdidos por cierres contra 225.462 por contracción de empresas que siguen (con estacionalidad; 230.305 sin estacionalidad).
- «Cierre» = la CUIT deja de declarar empleo en el SIPA (no es baja en ARCA ni quiebra); el OEDE avisa que los cierres recientes se revisan.

## No hay
Cierres por tamaño en una tabla oficial (CEP XXI, ARCA): no se encontró. El dato de CEPA (privado) no se usa.
