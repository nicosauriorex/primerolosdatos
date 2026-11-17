# Foco del teclado en las ventanas

Estado: en curso (2026-11-17)

## Problema
`Modal` (`web/components/ui.tsx`) es la ventana de casi todo el sitio (Configuración, Elegir variable, Configurar variable, Compartir como imagen, Resumen del día, De dónde sale en Herencia, el detalle del semáforo…). Al abrirse no mueve el foco: quien navega con teclado o lector de pantalla sigue parado en el botón de atrás de la ventana, y Tab recorre la página tapada. Al cerrarse, el foco no vuelve al botón que la abrió. Lo mismo pasa con la vista ampliada de un gráfico (`Expandido`, `web/components/Grafico.tsx`).

`Hoja`, `BuscadorGlobal`, `InfoPunto` y `VistaCompleta` ya lo hacen bien y no se tocan.

## Qué se hace
1. **Una sola implementación:** un hook `useFocoVentana(panel)` en `ui.tsx` con el mismo contrato que `Hoja`:
   - al abrir, guarda el elemento con foco y lleva el foco a la ventana (el contenedor `role="dialog"`, con `tabIndex={-1}`), salvo que algo de adentro ya lo tenga (un `autoFocus`, por ejemplo el buscador de «Elegir variable»);
   - Tab y Mayús+Tab no salen de la ventana (vuelven al principio o al final);
   - al cerrar, el foco vuelve al elemento guardado si sigue en la página.
   - Con ventanas una dentro de otra (p. ej. «Cómo verlo» abierta desde «Configurar variable»), solo atrapa la de arriba: el Tab de la de adentro no lo procesa la de afuera.
2. `Modal` y `Expandido` usan el hook.
3. Sin cambio visual: el contorno de foco del contenedor no se dibuja (`outline: none` en `.modal:focus` y `.exp:focus`), los botones de adentro conservan el suyo.

## Cómo se verifica
- `npm run tipos`, `npm run lint`, `npm run build` sin errores.
- En el navegador (vista `web-out`): abrir Configuración con el teclado → `document.activeElement` está dentro de la ventana; Tab desde el último botón vuelve al primero; Escape cierra y el foco vuelve al botón de Configuración.
- «Elegir variable» (Histórico): el foco queda en el buscador, no en el contenedor.
- Ventana dentro de ventana: «Configurar variable» → «Cómo verlo»; al cerrar la de adentro el foco vuelve a su botón dentro de la de afuera.
- Vista ampliada de un gráfico: el foco entra y vuelve al botón de ampliar.

## Verificación (2026-11-17)
- `npm run tipos`, `npm run lint`, `npm run build`: sin errores.
- Navegador (vista `web-out`, probado con teclas reales y midiendo `document.activeElement`; sin errores de consola):
  - Configuración: el foco entra; Mayús+Tab va al último («Listo»); Tab desde ahí vuelve a la cruz; Escape devuelve el foco al engranaje.
  - Elegir variable: el foco queda en el buscador; al cerrar vuelve a «Cambiar dato».
  - «Cómo verlo» dentro de Elegir variable: Tab y Mayús+Tab quedan en la de adentro; al cerrarla, el foco vuelve a «Cómo verlo».
  - Gráfico a pantalla completa: el foco entra; al cerrar vuelve a «Ver el gráfico a pantalla completa».
  - Compartir → vista previa a pantalla completa: Tab no sale; al cerrar vuelve a la vista previa; al cerrar Compartir, a su botón.
  - Captura: la ventana abierta se ve igual que antes, sin contorno en el contenedor.
- Revisor, primera vuelta: tres errores corregidos. Lo de adentro de un plegable cerrado (`inert`) contaba como último control; la vista a pantalla completa de Compartir (`VistaCompleta`) no tenía el contrato y ahora usa el hook; en desarrollo (StrictMode) se perdía el `autoFocus`, y ahora el foco se devuelve solo si la ventana ya no está.
- Revisor, segunda vuelta: sin problemas nuevos.
- Quedan sin arreglar (raros):
  - Una ventana que al cerrarse abre otra con `luego`: al cerrar la segunda, el foco puede caer al cuerpo de la página.
  - Un `Selector` abierto que sea el último control: Tab puede salir de la ventana.
- Sin verificar: con un lector de pantalla real.

## Dónde ver los cambios
Se nota con el teclado (Tab, Enter, Escape). A la vista no cambia nada. Para verlo en el sitio publicado hace falta commit y push.
1. Menús
   1.1 Configuración (engranaje): `/`. Pediste: «Foco de ventanas».
2. Histórico
   2.1 Cambiar dato: `/historico/`. Pediste: «Foco de ventanas».
   2.2 Cambiar dato → «Cómo verlo», ventana dentro de ventana: `/historico/`. Agregado por mí: caso de ventanas anidadas.
   2.3 Gráfico a pantalla completa: `/historico/`. Agregado por mí: tenía la misma falla.
   2.4 Compartir como imagen → vista previa a pantalla completa: `/historico/`. Agregado por mí: lo marcó el revisor.
3. Presidentes · Herencia
   3.1 «De dónde sale» y «Cómo se calcula»: `/herencia/`. Agregado por mí: misma ventana.
4. Novedades
   4.1 Resumen del día: `/novedades/`. Agregado por mí: misma ventana.
5. Semáforo
   5.1 Detalle de cada indicador y Compartir: `/semaforo/`. Agregado por mí: misma ventana.
