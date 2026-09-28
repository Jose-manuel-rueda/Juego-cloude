# Cuadrícula

Juego de estrategia de encajar piezas y hacer explotar cuadrados. HTML + JavaScript sin dependencias, pensado primero para móvil.

## Cómo jugar

Abre `index.html` en el navegador.

1. **Arrastra** una pieza de la bandeja al tablero. **Tócala** para girarla (con ratón: clic derecho o `R` mientras arrastras).
2. Llena un **cuadrado de 3×3 o más** con al menos 2 piezas y **explota**. Antes de soltar, brillan las casillas que van a explotar.
3. **Racha**: si explotas varias veces seguidas, cada explosión vale ×2, ×3… Si pasan 3 jugadas sin explotar, se pierde.
4. **Nada es al azar**: la pieza que eliges decide las 3 siguientes (tabla `NEXT` en `logic.js`). Se ven en pequeño debajo de cada pieza. Una pieza usada no vuelve en 3 turnos.
5. **★ Estrellas**: gastas una para descartar una pieza. Ganas una al limpiar 16 casillas de golpe (máx. 3).

Bonus de 500 puntos por dejar el tablero vacío. Pierdes cuando ninguna pieza cabe y no te quedan ★. La partida y el récord se guardan solos.

Tableros de 8×8 o 16×16 (menú ☰). Piezas de 2, 4, 8 y 16 casillas.

## Archivos

- `logic.js` — reglas del juego (sin DOM).
- `game.js` — dibujo, arrastre táctil, efectos y sonido.
- `tests/logic.test.js` — tests: `node tests/logic.test.js`
