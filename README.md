# Ballistic Calculator

A lightweight, mobile-first, browser-based ballistic fire solution calculator.  
Designed for fast field use — no server, no install, works offline as a PWA.

## Features

### Fire Solution
- **Ammunition selection** from a pre-loaded ballistic table (CSV)
- **Pure ballistic** correction (elevation and azimuth) interpolated from range
- **TOF lead** — target velocity correction (Vz lateral / Vy vertical) multiplied by time of flight
- **Roll effect** — corrects ballistic and drift values for platform roll angle
- **Parallax correction** — optical parallax offset (X/Y/Z in mm) converted to mrad at range:
  - Yaw correction: `0.001 × Y / range`
  - Pitch correction: `0.001 × Z / range`
- **Total solution** = ballistic + TOF lead + roll effect + parallax, displayed in mrad

### Results Display
- **Numeric table** — per-component breakdown (Yaw / Pitch) in mrad:
  - Pure Ballistic
  - TOF Lead
  - Roll Effect
  - Ballistic Total (sub-total before parallax)
  - Parallax
  - **TOTAL**
- **TOF badge** — time of flight and interpolated range
- **Reticle canvas** — visual 2D plot of pure ballistic, TOF lead, and total solution points

### Inputs & Controls
- **2×2 input grid** — Range, Platform Roll, Target Vel. Yaw (Vz), Target Vel. Pitch (Vy)
- **± stepper buttons** — tap for coarse step, hold for fine step
- **Parallax row** — three plain numeric inputs (X / Y / Z) with defaults 0 / 624 / −115 mm
- **Auto-calculate** — result updates automatically 300 ms after any input change
- **CALCULATE button** — manual trigger
- Stepper buttons do **not** open the mobile keyboard

### App
- **Dark / Light theme** — tap the title "Ballistic Calculator" in the nav bar to toggle
- **PWA / offline** — installable via browser, works without internet after first load
- **Input persistence** — all values (including parallax) are saved to `localStorage` and restored on reload

## File Structure
```
Rballistics/
├── index.html            # App layout and structure
├── app.css               # Styling (dark/light themes, layout)
├── app.js                # All logic: calculation, stepper, reticle, persistence
├── ballistic-table.csv   # Ammo ballistic data (range, SE, TOF, drift)
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker (offline caching)
├── images/
│   ├── RafLogo.svg       # Left nav logo
│   └── logo-title.svg    # Right nav logo
└── README.md             # This file
```

## Ballistic Table Format

`ballistic-table.csv` must have these columns:

| Column   | Description                        |
|----------|------------------------------------|
| `Ammo`   | Ammunition name (used in dropdown) |
| `fRange` | Range in metres                    |
| `fSE`    | Elevation correction in mrad       |
| `fTOF`   | Time of flight in seconds          |
| `fDrift` | Lateral drift correction in mrad   |

Each ammo type can have multiple rows (one per range step). Values between rows are linearly interpolated.

## Browser Requirements

Works in any modern browser:

- Chrome / Edge
- Firefox
- Safari (iOS supported)

## Contact

Amihay Blau  
mail: amihay@blaurobotics.co.il
