# Random

Day to day usable Python codes and end-to-end deployed projects.

## Browser games

- Space Shooter: `index.html`
- One-Button Shape Shifter: `shape-shifter/index.html`
- FPS Blitz: `fps-blitz/index.html`

## Space Shooter

A simple arcade-style shooting game built with Python and `pygame`.

## Browser version

This project also includes a GitHub Pages version:

- `index.html`
- `style.css`
- `game.js`

After enabling GitHub Pages in the repository settings, the browser game will be available at:

`https://shubhjeetkt.github.io/random/`

## Features
- Player spaceship with smooth movement
- Multiple enemy types
- Power-ups: shield, rapid fire, bomb
- Score and level system
- Restart after game over

## Play in browser locally

Open `index.html` directly or run a small local server:

```bash
python -m http.server 8080
```

Then open `http://127.0.0.1:8080`

## Run locally

```bash
pip install -r requirements.txt
python main.py
```

## Controls
- `WASD` or arrow keys: move
- `Space`: shoot
- `Esc`: quit
- `R`: restart after game over

## Project structure
- `main.py` - game source
- `requirements.txt` - dependency list
- `.gitignore` - git ignore rules
