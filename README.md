# Cuadrícula

Juego de estrategia de colocar piezas en una cuadrícula. HTML + JavaScript sin dependencias.

## Cómo jugar

Abre `index.html` en el navegador (doble clic basta).

## Reglas

1. La cuadrícula ocupa el máximo de pantalla y sus lados son múltiplos del valor elegido: 4, 8, 16 o 32.
2. Hay 15 piezas de 2, 4, 8 y 16 casillas, cada una de un color, pensadas para encajar entre sí.
3. Nada es al azar: las 3 piezas ofrecidas dependen de la que elegiste antes (tabla `NEXT` en `logic.js`), y una pieza usada no vuelve a salir en los siguientes 3 turnos.
4. Cuando varias piezas forman un **cuadrado exacto** (lleno, con al menos 2 piezas y sin que ninguna sobresalga) desaparece y liberas ese espacio. Puntos: lado² × número de piezas.

La partida termina cuando ninguna pieza ofrecida cabe.

## Controles

- Ratón: mover para ver la pieza, clic para colocar, clic derecho para girar.
- Teclado: `R` gira, `1` `2` `3` eligen pieza.
- Móvil: toca para ver la pieza y vuelve a tocar en el mismo sitio para colocarla. Botón "Girar".

## Archivos

- `logic.js` — reglas del juego (sin DOM).
- `game.js` — dibujo y controles.
- `tests/logic.test.js` — tests: `node tests/logic.test.js`
