# Elevator DFA Simulator

An interactive website that models an elevator as a deterministic finite automaton (DFA). Built with plain HTML, CSS and JavaScript, with no libraries or backend.

## Run it

Put `index.html`, `style.css` and `script.js` in one folder and open `index.html` in a browser.

## The DFA

M = (Q, Σ, δ, q₀, F)

- **Q:** 48 states. Each is a phase (`IDLE`, `MOVING_UP`, `MOVING_DOWN`, `ARRIVED`, `DOOR_OPEN`) plus a floor (G to 5), and a destination while moving. Example: `MOVING_UP[1→3]`.
- **Σ:** 9 symbols: `SELECT_0` to `SELECT_5`, `FLOOR_REACHED`, `OPEN_DOOR`, `CLOSE_DOOR`.
- **δ:** a lookup table covering every state and input pair. Meaningless inputs (like opening the doors while moving) are self-loops.
- **q₀:** `IDLE[0]`.
- **F:** all `DOOR_OPEN[f]` states. A string is accepted if it ends with the doors open at a stopped floor.

## Features

- Animated elevator with floor display, status and progress bar
- Live state diagram and transition table, both generated from the real transition table
- Event log, transition counter and input string
- Auto mode and Step-by-step mode
- Input lab for applying any symbol
- Run Example, Reset and sound toggle
- Learn section and short quiz

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Styling and layout |
| `script.js` | DFA logic (Part 1) and UI (Part 2) |

## Demo tip

Switch to Step mode, press floor 3, and press Step repeatedly. Watch the highlighted arrow and table row. Then try `OPEN_DOOR` while moving to show a self-loop.

## Simplifications

One request at a time, no request queue, no weight or fault sensors. "Door Opening" and "Door Closing" are display labels, not separate states.