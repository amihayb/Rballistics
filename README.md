# Ballistic Calculator

A lightweight, mobile-first, browser-based ballistic fire solution calculator.  
Designed for fast field use — no server, no install, works offline as a PWA.

## Features

### Fire Solution
- **Ammunition selection** from a pre-loaded ballistic table (CSV)
- **Pure ballistic** correction (elevation and azimuth) interpolated from range
- **TOF lead** — target velocity correction (Vy vertical, Vz lateral) multiplied by time of flight
- **Roll effect** — corrects ballistic and drift values for platform roll angle
- **Total solution** = ballistic + TOF lead + roll effect, displayed in mrad

### Results Display
- **Numeric table** — breakdown of each component (Pitch / Yaw) in mrad
- **TOF badge** — time of flight and interpolated range
- **Reticle canvas** — visual 2D plot of pure ballistic, TOF lead, and total solution points

### Inputs & Controls
- **Range** — tap ±100 m, hold for ±10 m
- **Platform Roll** — tap ±1°, hold for ±0.1°
- **Target Velocity Vy / Vz** — tap ±1 mrad/s, hold for ±0.1 mrad/s
- **Auto-calculate** — result updates automatically 300 ms after any input change
- **CALCULATE button** — manual trigger

### App
- **Dark / Light theme** — tap the title "Ballistic Calculator" in the nav bar to toggle
- **PWA / offline** — installable via browser, works without internet after first load
- **Input persistence** — last values and ammo selection are saved across sessions

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
