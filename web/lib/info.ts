// GENERADO a partir de src/app.js (textos de ayuda por categoría). Editar acá desde ahora.
// Marcado (R16): lo que tiene varias entradas va como lista de definiciones <dl><dt>nombre</dt><dd>explicación</dd></dl>; el resto, párrafos.
export const INFO_CAT: Record<string, string> = {
  "Salarios": `<p><b>¿Qué salario mirar?</b></p><dl>
    <dt>Salario mediano (trabajadores registrados)</dt><dd>El sueldo bruto del asalariado registrado del sector privado (sistema SIPA) que está justo en el medio (la mitad gana menos). <b>Es el más representativo del trabajador formal típico</b>, porque los sueldos muy altos no lo inflan.</dd>
    <dt>Salario promedio (trabajadores registrados)</dt><dd>El mismo universo, pero promedio; los sueldos altos lo tiran para arriba (suele ser ~30% más que la mediana). Incluye horas extra, premios y aguinaldo (acá repartido en el semestre).</dd>
    <dt>Salario promedio de empleos estables (RIPTE)</dt><dd>Promedio de la remuneración imponible de trabajadores estables. Se usa para actualizar cosas por ley (riesgos del trabajo, antes jubilaciones). Tiene tope imponible, así que recorta los sueldos más altos. Sin aguinaldo en la fuente (acá × 13/12).</dd>
    <dt>Índice de salarios (todos los trabajadores) e Índice de salarios informales</dt><dd>No es un monto sino un índice. Es el único que cubre también al <b>sector público</b> y a los <b>no registrados (informales)</b>; el informal sale con 5 meses de rezago. Sirve para comparar evolución, no niveles.</dd>
    <dt>Salario mínimo (vital y móvil)</dt><dd>Es un piso legal, no lo que cobra la gente (casi ningún convenio formal está tan abajo). Sirve como referencia legal: seguro de desempleo, planes sociales, embargos, montos de multas. No sirve para saber cuánto se gana.</dd>
    <dt>Jubilación mínima y Jubilación mínima con bono</dt><dd>Haber mínimo de ANSES (lo cobra cerca de la mitad de los jubilados). "Con bono" suma el refuerzo que paga el Gobierno aparte, que desde mar-2024 está fijo en $70.000 y no se actualiza.</dd></dl>
    <p>Todos son brutos (antes de descuentos), salvo jubilaciones.</p>`,
  "Precios": `<dl>
    <dt>Inflación</dt><dd>El IPC de largo plazo, mensual, interanual o como promedio de 12 meses.</dd>
    <dt>IPC INDEC</dt><dd>Índices por rubro (base dic-2016 = 100); cada rubro se lista una vez y la <b>región</b> se elige en "Configurar variable". Además del índice tal cual, cada rubro se puede ver como <b>inflación</b> (variación mensual, interanual o promedio de 12 meses) o como <b>precio relativo</b> (cuánto subió contra la inflación general). Para saber si se encarecieron más los bienes o los servicios: elegí "IPC Bienes (Nacional)" y "IPC Servicios (Nacional)" con "Variación interanual", o comparalos en base 100.</dd>
    <dt>Precios promedio</dt><dd>El precio en pesos de productos concretos (kg de asado, litro de leche), que sí se pueden poner "en términos de" un salario o del dólar.</dd></dl>
    <p>La <b>inflación de largo plazo</b> empalma el IPC con fuentes alternativas para 2007-2016, cuando el INDEC estuvo intervenido.</p>`,
  "IPC por rubros": `<p>Índices de precios al consumidor del INDEC. Nacional: nivel general y 12 divisiones; las regiones agregan grupos y clases (carnes, alquiler, combustibles, etc.). Un índice no tiene unidad: 250 quiere decir que los precios son 2,5 veces los de dic-2016. Cada rubro se puede ver como variación mensual, interanual o promedio de 12 meses (su propia inflación) o como índice. En cualquiera de las cuatro formas se puede ver nominal o real (contra la inflación general): el índice real es el precio relativo; por encima de 100 de su base, subió más que el IPC general.</p>`,
  "Opinión pública (UTDT)": `<p>Encuestas mensuales de la Universidad Di Tella.</p><dl>
    <dt>Confianza del consumidor (ICC)</dt><dd>De 0 a 100, cómo ve la gente su situación, la del país y si es momento de comprar durables o inmuebles.</dd>
    <dt>Confianza en el gobierno (ICG)</dt><dd>De 0 a 5, evalúa al gobierno nacional en evaluación general, interés general, eficiencia, honestidad y capacidad. Suele caer fuerte en las crisis y subir en el primer año de cada gobierno.</dd></dl>`,
  "Precios promedio por producto (INDEC)": `<p>Precio promedio en pesos que releva el INDEC para el IPC (desde 2016). Cada producto se lista una vez (GBA tiene ~60 productos; las otras regiones, unos 14) y la región se elige en "Configurar variable". Se puede ver en pesos reales, en dólares o "en términos de" un salario: cuántos kg compra un sueldo.</p>`,
  "Dólar y tipo de cambio": `<dl>
    <dt>Oficial (A3500)</dt><dd>Mayorista de referencia del BCRA.</dd>
    <dt>Minorista</dt><dd>El de las ventanillas de bancos.</dd>
    <dt>Blue</dt><dd>Mercado informal.</dd>
    <dt>MEP y CCL</dt><dd>Dólar comprado con bonos o acciones, legal; el CCL deja el dinero afuera.</dd>
    <dt>Brecha</dt><dd>Cuánto más caro está un dólar que el oficial.</dd>
    <dt>Tipo de cambio real multilateral</dt><dd>Compara el peso con las monedas de los socios comerciales ajustando por inflación de cada país; más alto = Argentina más barata (dólar "alto").</dd></dl>`,
  "Tasas de interés": `<p>Tasas nominales anuales (TNA). Con inflación alta la TNA engaña: se puede ver la <b>tasa real</b> (descontada la inflación). Real anual: la TEA contra la inflación de los 12 meses previos. Real mensual: la tasa del mes contra la inflación de ese mes. Positiva = el plazo fijo le ganó a la inflación.</p>`,
  "Dinero y bancos (BCRA)": `<dl>
    <dt>Base monetaria</dt><dd>Billetes en circulación más encajes de los bancos en el BCRA.</dd>
    <dt>Depósitos y préstamos</dt><dd>Totales del sistema.</dd>
    <dt>Reservas</dt><dd>Brutas (incluyen encajes en dólares, swap con China y préstamos; las netas son bastante menos).</dd></dl>
    <p>Los montos agregados se pueden ver por habitante o como % del PIB.</p>`,
  "Actividad": `<dl>
    <dt>EMAE</dt><dd>Estimador mensual de la actividad (anticipa el PIB).</dd>
    <dt>PIB</dt><dd>Trimestral, a precios de 2004 (ya es real).</dd>
    <dt>ISAC</dt><dd>Construcción.</dd></dl>
    <p>Son índices o cantidades: no se pasan a dólares ni a pesos reales.</p>`,
  "Empleo, pobreza e ingresos": `<dl>
    <dt>Desocupación, empleo e informalidad</dt><dd>EPH, trimestral, 31 aglomerados urbanos.</dd>
    <dt>Trabajadores registrados</dt><dd>Registro de aportes (SIPA), mensual (personas con aportes).</dd>
    <dt>Pobreza e indigencia</dt><dd>EPH, semestral (se ubica en enero y julio).</dd>
    <dt>Canastas</dt><dd>Lo que una familia necesita para no ser pobre (CBT) o indigente (CBA).</dd>
    <dt>AUH y Prestación Alimentar: cuántas canastas cubren</dt><dd>Hay dos cuentas, y comparan cosas distintas. <b>La del Ministerio de Capital Humano</b> suma la AUH completa y la Prestación Alimentar de un hijo, y la compara con la canasta alimentaria de <b>un adulto</b>. <b>La de la UCA</b> (Universidad Católica Argentina) toma lo que cobra en mano un hogar con dos hijos de 6 y 8 años y lo compara con la canasta alimentaria de <b>toda la familia</b> (hogar de 4); no incluye otros ingresos. Por eso dan resultados muy distintos.</dd>
    <dt>Pensiones no contributivas</dt><dd>Se publica la cantidad vigente a diciembre de cada año, no las altas: la diferencia entre dos diciembres es altas menos bajas.</dd></dl>`,
  "Sector externo": `<p>Exportaciones e importaciones de bienes (INDEC, en dólares), saldo comercial, términos del intercambio (precio de lo que vendemos vs. lo que compramos) y soja.</p>`,
  "Fiscal": `<p>Sector público nacional, base caja.</p><dl>
    <dt>Resultado primario</dt><dd>Ingresos menos gastos sin contar intereses de la deuda.</dd>
    <dt>Resultado financiero</dt><dd>Después de pagar intereses.</dd>
    <dt>Deuda pública</dt><dd>Secretaría de Finanzas, mensual desde 2019 y en dólares. La deuda consolidada del Tesoro y el Banco Central es una cuenta propia que suma lo que ambos deben a terceros.</dd></dl>
    <p>Las cifras mensuales son muy estacionales: conviene verlas como % del PIB (suma de 12 meses) o por año.</p>`,
  "Contexto internacional": `<p>Lo que pasa afuera y la Argentina no controla.</p><dl>
    <dt>Precios de la soja, el maíz, el trigo y el petróleo</dt><dd>Banco Mundial vía FRED, en dólares: se pueden ver en dólares de hoy.</dd>
    <dt>Términos de intercambio</dt><dd>INDEC: precio de lo que exportamos contra el de lo que importamos.</dd>
    <dt>Tasa de la Fed</dt><dd>Lo que rinden los bonos del Tesoro de EE.UU. a muy corto plazo; si sube, el crédito para países como el nuestro se encarece.</dd></dl>
    <p>La comparación con otros países está en la sección Contexto.</p>`,
  "Mercados": `<dl><dt>Riesgo país</dt><dd>Cuánta tasa extra paga Argentina sobre los bonos de EEUU (en puntos básicos: 100 = 1%). Más bajo = el mundo confía más.</dd></dl>`,
};

/** Explicación corta (1 o 2 líneas) de cada categoría de primer nivel y la variable que se recomienda mirar primero.
 *  Se muestran arriba de la lista del selector de variables; la explicación larga (`INFO_CAT`) queda en "ver más".
 *  Si el id recomendado no existe en el catálogo, el botón no aparece. */
export interface Recomendada { id: string; nombre: string; med?: string; esc?: string }
export const INFO_CORTA: Record<string, { texto: string; reco: Recomendada }> = {
  "Salarios": { texto: "Cuánto cobran los trabajadores: sueldos de empleados registrados, salario mínimo y jubilación mínima.", reco: { id: "sipa_med", nombre: "Salario mediano (trabajadores registrados)", med: "real" } },
  "Precios": { texto: "Cuánto suben los precios: inflación, índices por rubro y región, y el precio de productos concretos.", reco: { id: "ipc_empalme", nombre: "Inflación", med: "vm" } },
  "Dólar y tipo de cambio": { texto: "A cuánto está el dólar (oficial, blue, MEP, CCL) y cuánto cuesta comparado con otras monedas.", reco: { id: "fx_blue", nombre: "Dólar blue", med: "real" } },
  "Mercados": { texto: "Cómo ve el mundo financiero a la Argentina: riesgo país, acciones y bonos.", reco: { id: "riesgo", nombre: "Riesgo país" } },
  "Tasas de interés": { texto: "Cuánto paga un plazo fijo o cuesta un préstamo, y si le gana o no a la inflación.", reco: { id: "bcra_12", nombre: "Tasa de plazo fijo" } },
  "Dinero y bancos (BCRA)": { texto: "Pesos en circulación, depósitos, préstamos y reservas del Banco Central.", reco: { id: "bcra_1", nombre: "Reservas del Banco Central", med: "usdr" } },
  "Actividad": { texto: "Cuánto produce la economía: actividad mensual, PIB, industria y construcción.", reco: { id: "dg_143_3_no_pr_2004_a_31", nombre: "Actividad económica (EMAE)" } },
  "Empleo, pobreza e ingresos": { texto: "Cuánta gente trabaja, cuánta es pobre y cuánto necesita una familia para vivir.", reco: { id: "dg_42_3_eph_puntuatal_0_m_30", nombre: "Desocupación" } },
  "Sector externo": { texto: "Lo que Argentina vende y compra al mundo: exportaciones, importaciones y su saldo.", reco: { id: "dg_saldo_comercial", nombre: "Saldo comercial (% del PIB)", esc: "pib" } },
  "Fiscal": { texto: "Cuánto gasta y cuánto recauda el Estado nacional, y si le sobra o le falta plata.", reco: { id: "dg_379_9_superavit_017_23_94", nombre: "Resultado fiscal primario (% del PIB)", esc: "pib" } },
  "Contexto internacional": { texto: "Precios de la soja, el maíz, el trigo y el petróleo, términos de intercambio y tasa de la Fed.", reco: { id: "ctx_soja", nombre: "Soja (Banco Mundial)", med: "usdr" } },
  "Opinión pública (UTDT)": { texto: "Qué opina la gente: confianza del consumidor y confianza en el gobierno (Universidad Di Tella).", reco: { id: "dg_380_3_icc_nacionnal_0_t_12", nombre: "Confianza del consumidor" } },
};
