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
    <dt>ISAC</dt><dd>Construcción.</dd>
    <dt>Patentamientos y autos usados</dt><dd>Autos inscriptos por primera vez (0 km) y transferencias de autos usados, suma de todas las provincias (Registro del Automotor, Ministerio de Justicia). Lo mismo para motos.</dd>
    <dt>Consumo de carne</dt><dd>Kilos por habitante por año de carne vacuna, de la Secretaría de Agricultura. Anual.</dd>
    <dt>Demanda de electricidad</dt><dd>Energía pedida al sistema mayorista (CAMMESA), en GWh. Depende del clima: conviene comparar contra el mismo mes de otros años.</dd></dl>
    <p>Son índices o cantidades: no se pasan a dólares ni a pesos reales.</p>`,
  "Empleo, pobreza e ingresos": `<dl>
    <dt>Desocupación, empleo e informalidad</dt><dd>EPH, trimestral, 31 aglomerados urbanos.</dd>
    <dt>Trabajadores registrados</dt><dd>Registro de aportes (SIPA), mensual (personas con aportes).</dd>
    <dt>Pobreza e indigencia</dt><dd>EPH, semestral (se ubica en enero y julio).</dd>
    <dt>Canastas</dt><dd>Lo que una familia necesita para no ser pobre (CBT) o indigente (CBA).</dd>
    <dt>AUH y Prestación Alimentar: cuántas canastas cubren</dt><dd>Hay dos cuentas, y comparan cosas distintas. <b>La del Ministerio de Capital Humano</b> suma la AUH completa y la Prestación Alimentar de un hijo, y la compara con la canasta alimentaria de <b>un adulto</b>. <b>La de la UCA</b> (Universidad Católica Argentina) toma lo que cobra en mano un hogar con dos hijos de 6 y 8 años y lo compara con la canasta alimentaria de <b>toda la familia</b> (hogar de 4); no incluye otros ingresos. Por eso dan resultados muy distintos.</dd>
    <dt>Pensiones no contributivas</dt><dd>Se publica la cantidad vigente a diciembre de cada año, no las altas: la diferencia entre dos diciembres es altas menos bajas.</dd>
    <dt>Empleo público nacional</dt><dd>Empleados de la administración pública nacional y de las empresas y sociedades del Estado (INDEC). Empieza en julio de 2022: no compara con gobiernos anteriores. El empleo público de cada provincia está en la sección Provincias.</dd>
    <dt>Puestos de trabajo totales</dt><dd>Cuenta <b>puestos</b>, no personas (quien tiene dos trabajos cuenta dos veces), formales e informales. Combina registros de aportes con la encuesta de hogares, por eso no coincide con la EPH (personas, 31 aglomerados) ni con el SIPA (solo lo formal). Trimestral y sin quitarle la estacionalidad: el 4.º trimestre es siempre el más alto, conviene comparar con el mismo trimestre de otro año.</dd>
    <dt>Personas pobres</dt><dd>Cantidad de personas, no porcentaje. La cifra oficial es la de los 31 aglomerados urbanos (unos 30 millones de personas). «Todo el país» es una estimación propia que supone la misma tasa en el resto del país. La estimación mensual de la Universidad Di Tella es privada y se revisa.</dd>
    <dt>Empresas con trabajadores registrados</dt><dd>Empleadores con al menos un trabajador declarado en una ART (Superintendencia de Riesgos del Trabajo). Un cambio de un mes puede venir de rescisiones o de nóminas vacías: no es lo mismo que empresas que abren o cierran.</dd></dl>`,
  "Sector externo": `<p>Exportaciones e importaciones de bienes (INDEC, en dólares), saldo comercial, términos del intercambio (precio de lo que vendemos vs. lo que compramos) y soja. También las importaciones de bienes de consumo y los viajes al exterior en avión (pasajeros por Ezeiza y Aeroparque, INDEC). Los proyectos aprobados del RIGI (Régimen de Incentivo para Grandes Inversiones) están en su propia página.</p>`,
  "Fiscal": `<p>Sector público nacional, base caja.</p><dl>
    <dt>Resultado primario</dt><dd>Ingresos menos gastos sin contar intereses de la deuda.</dd>
    <dt>Resultado financiero</dt><dd>Después de pagar intereses.</dd>
    <dt>Deuda pública</dt><dd>Secretaría de Finanzas, mensual desde 2019 y en dólares. La deuda consolidada del Tesoro y el Banco Central es una cuenta propia que suma lo que ambos deben a terceros.</dd>
    <dt>Subsidios al transporte</dt><dd>Plata del Estado nacional para que colectivos y trenes cobren menos de lo que cuestan; base caja, mensual. Los subsidios a la energía están aparte y son trimestrales.</dd>
    <dt>Transferencias a provincias</dt><dd>Las que decide el gobierno nacional (no automáticas): no incluye la coparticipación. Las corrientes son para gastos del día a día; las de capital, para obras.</dd>
    <dt>Obra pública nacional</dt><dd>Compra y construcción de bienes de capital del sector público nacional (rutas, edificios, equipos), base caja. No incluye lo que la Nación gira a las provincias para obras: eso está en «Transferencias de capital a provincias». Se ve mejor en pesos de hoy o como % del PIB.</dd>
    <dt>Gasto por función</dt><dd>Gasto devengado de la administración nacional en salud, educación, ciencia, seguridad y defensa, en % del PIB del año. No incluye lo que gastan provincias y municipios. Dato anual, ubicado en diciembre.</dd>
    <dt>Recaudación por impuesto</dt><dd>Lo que ARCA (ex AFIP) recaudó cada mes por IVA, Ganancias, retenciones a las exportaciones, Bienes Personales, impuesto PAIS, impuesto al cheque y aportes a la seguridad social. Va en pesos de cada mes: se ve mejor en pesos de hoy o como % del PIB.</dd></dl>
    <p>Las cifras mensuales son muy estacionales: conviene verlas como % del PIB (suma de 12 meses) o por año.</p>`,
  "Sociedad": `<dl>
    <dt>Homicidios dolosos</dt><dd>Sistema Nacional de Información Criminal (Ministerio de Seguridad), anual. La <b>tasa de víctimas</b> es la que cita el Gobierno; la de <b>hechos</b> cuenta casos (un hecho puede tener varias víctimas).</dd>
    <dt>Mortalidad infantil</dt><dd>Muertes de menores de un año cada 1.000 nacidos vivos (Ministerio de Salud). Anual; el último año sale con unos dos años de atraso.</dd>
    <dt>Muertes en siniestros viales</dt><dd>Muertes en hechos de tránsito registradas por las fuerzas de seguridad (SNIC, Ministerio de Seguridad). Puede diferir de la Agencia Nacional de Seguridad Vial, que cuenta también a quienes mueren hasta 30 días después. Anual.</dd>
    <dt>Personas presas</dt><dd>Presos en cárceles provinciales y federales a fin de cada año (SNEEP, Ministerio de Justicia). No incluye a los detenidos en comisarías.</dd>
    <dt>Robos y recuperos de autos</dt><dd>Denuncias de robo o hurto inscriptas en los Registros Seccionales del Automotor: no es el total de denuncias policiales. El recupero se cuenta en el mes en que se comunica, no en el del robo. Solo autos.</dd>
    <dt>Natalidad y mortalidad</dt><dd>Nacimientos (por residencia de la madre) y defunciones (ocurridas en el país): son criterios distintos. 2020-2022 tienen exceso de mortalidad por covid. Anual.</dd>
    <dt>Vacunación</dt><dd>Estimación de la OMS y UNICEF, que revisan la serie hacia atrás cada año. El Ministerio de Salud informa coberturas más altas con su registro nominal: son métodos distintos, no un error.</dd>
    <dt>Piquetes</dt><dd>Cortes de calle y ruta que cuenta la consultora Diagnóstico Político con noticias. Es un dato privado, cargado a mano con su cita.</dd></dl>
    <p>Son datos anuales, ubicados en diciembre de cada año.</p>`,
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
  "Sociedad": { texto: "Seguridad y salud: homicidios, mortalidad infantil, personas presas y muertes en siniestros viales.", reco: { id: "homicidios_tasa", nombre: "Homicidios dolosos cada 100.000 habitantes" } },
  "Contexto internacional": { texto: "Precios de la soja, el maíz, el trigo y el petróleo, términos de intercambio y tasa de la Fed.", reco: { id: "ctx_soja", nombre: "Soja (Banco Mundial)", med: "usdr" } },
  "Opinión pública (UTDT)": { texto: "Qué opina la gente: confianza del consumidor y confianza en el gobierno (Universidad Di Tella).", reco: { id: "dg_380_3_icc_nacionnal_0_t_12", nombre: "Confianza del consumidor" } },
};
