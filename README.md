# Cuadrícula

Juego de estrategia de encajar piezas y hacer explotar cuadrados. HTML + JavaScript sin dependencias, pensado primero para móvil.

## Cómo jugar

Abre `index.html` en el navegador.

1. **Arrastra** una pieza de la bandeja al tablero. **Tócala** para girarla (con ratón: clic derecho o `R` mientras arrastras).
2. Llena un **cuadrado de 3×3 o más** con al menos 2 piezas y **explota**. Antes de soltar, brillan las casillas que van a explotar.
3. **Racha**: si explotas varias veces seguidas, cada explosión vale ×2, ×3… Si pasan 3 jugadas sin explotar, se pierde.
4. **Nada es al azar**: la pieza que eliges decide las 3 siguientes (tabla `NEXT` en `logic.js`). Se ven en pequeño debajo de cada pieza. Una pieza usada no vuelve en 3 turnos.
5. **★ Estrellas**: gastas una para descartar una pieza. Ganas una al limpiar 16 casillas de golpe (máx. 3).

6. **Poderes**: 💣 bomba (rompe 3×3), martillo (quita una casilla) y deshacer. Se ganan con **misiones** (siempre hay 3 activas y cada una cumplida trae otra más difícil), al **subir de nivel** con la experiencia y al superar retos. Si te quedas sin hueco, puedes usarlos para salvar la partida.
7. **Retos**: 30 niveles con **gemas** que hay que liberar metiéndolas en un cuadrado que explote, con jugadas limitadas. De 1 a 3 estrellas según las jugadas. Cada reto abre el siguiente.

Bonus de 500 puntos por dejar el tablero vacío. Pierdes cuando ninguna pieza cabe y no te quedan ★. La partida y el récord se guardan solos.

Tableros de 8×8 o 16×16 en el modo infinito (pantalla de inicio ☰). Piezas de 2, 4, 8 y 16 casillas.

## Archivos

- `logic.js` — reglas del juego (sin DOM).
- `game.js` — dibujo, arrastre táctil, efectos y sonido.
- `levels.js` — retos generados con `node tools/gen-levels.js` (un bot comprueba que cada uno tiene solución y fija la marca).
- `tests/logic.test.js` — tests: `node tests/logic.test.js`
