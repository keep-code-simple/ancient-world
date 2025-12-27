# Ancient World 🏰⚔️

A browser-based third-person medieval adventure game with combat, loot, and progression.

![Gameplay Screenshot](https://raw.githubusercontent.com/keep-code-simple/ancient-world/main/screenshot.png)

## 🎮 Play Now

Open `index.html` in any modern browser or visit the GitHub Pages link.

---

## 🕹️ Controls

### Desktop (Keyboard + Mouse)

| Action | Control |
|--------|---------|
| **Move Forward** | `W` or `↑` |
| **Move Backward** | `S` or `↓` |
| **Move Left** | `A` or `←` |
| **Move Right** | `D` or `→` |
| **Look Around** | Move Mouse (after clicking canvas) |
| **Attack** | `Left Click` or `Space` |
| **Interact** | `E` (near Forge or Shrine) |
| **Zoom Camera** | Mouse Scroll Wheel |

> **Tip:** Click on the game canvas to lock the mouse for camera control. Press `Escape` to unlock.

---

### iPad / Mobile (Touch)

| Action | Control |
|--------|---------|
| **Move** | Virtual Joystick (bottom-left) |
| **Look Around** | Swipe/drag on game screen |
| **Attack** | ⚔️ Attack Button (bottom-right) |
| **Interact** | 🖐️ Interact Button (bottom-right) |

> **Tip:** Use two hands - left thumb on joystick, right thumb for attack/camera.

---

## 🎯 Gameplay

### Core Loop
1. **Explore** the medieval world
2. **Fight** enemies (Goblins, Orcs, Skeletons)
3. **Collect** loot drops (Ore, Relic Shards)
4. **Choose** your upgrade path
5. **Get Stronger** and repeat!

### Progression Choices

| Choice | Cost | Bonus |
|--------|------|-------|
| **Weapon Forge** 🔥 | 3 Ore | +25% Attack, Power Strike ability |
| **Relic Shrine** ✨ | 2 Shards | +20% All Stats, Health Regen |

---

## 🛠️ Tech Stack

- **Engine:** Three.js
- **Language:** Vanilla JavaScript
- **Styling:** CSS3 with glassmorphism effects
- **Platform:** Any modern browser (Chrome, Safari, Firefox, Edge)

---

## 📁 Project Structure

```
ancient-world/
├── index.html      # Main HTML
├── styles.css      # UI styling
└── js/
    ├── game.js         # Main game loop
    ├── input.js        # Keyboard/mouse/touch input
    ├── camera.js       # Third-person camera
    ├── world.js        # Environment generation
    ├── player.js       # Player entity
    ├── enemy.js        # Enemy AI
    ├── companion.js    # AI companion
    ├── combat.js       # Combat system
    ├── loot.js         # Loot drops
    ├── progression.js  # Leveling system
    └── ui.js           # HUD updates
```

---

## 🚀 Running Locally

```bash
# Using http-server
npx http-server -p 8080

# Then open http://localhost:8080
```

---

## 📝 Future Ideas

- [ ] Real multiplayer co-op
- [ ] Skill trees
- [ ] Boss encounters
- [ ] Save/load system
- [ ] Sound effects & music
- [ ] Better 3D models (GLTF)

---

## 📄 License

MIT
