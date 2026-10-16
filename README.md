# Plana

A room planner for a single flat: draw and stretch walls, mark rooms, and lay out furniture on a plan drawn to scale, with dimension strings that update as the walls move. It starts with a 5.34 × 5.46 m one-bedroom unit.

Plain HTML, CSS and JavaScript modules. There is no build step and nothing to install.

## Running it

Browsers won't load JavaScript modules from `file://`, so opening `index.html` directly shows an empty page. Serve the folder over HTTP instead.

On Windows, with nothing installed:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8080/>. Pass `-Port 5500` to use another port.

Any static server works just as well, for example the VS Code **Live Server** extension, `npx serve`, or `python -m http.server`.

The plan is saved in the browser's localStorage, per browser. Use **Export** and **Import** to move a plan between browsers.

## Layout

```
index.html              page markup, SVG patterns, plan layers
serve.ps1               local static server for Windows
src/
  main.js               entry point: wires modules together, loads the plan
  core/
    dom.js              element lookups and the SVG layers
    markup.js           SVG string builders (R, C, L, PA, TX…), esc, wave
    math.js             rounding, boxes, item corners, polygon overlap test
  model/                data, with no knowledge of the page
    state.js            S: the whole app state, plus selectors and helpers
    units.js            m / cm / mm conversion and formatting
    wallKinds.js        wall, window, door, slider, screen, railing, column, duct
    catalog.js          furniture drawings and default sizes
    samples.js          the starting plan
    sanitize.js         validates saved and imported JSON
    storage.js          localStorage save and load
    history.js          undo / redo
  geometry/             calculations on the plan
    walls.js            segment maths, curves, joined corners, wall outlines, plan extents
    rooms.js            which room a point is in, room numbers
    issues.js           clash checks: walls, door swings, other furniture
  view/                 what depends on the screen scale
    viewport.js         viewBox, zoom, pan, fit, scale bar
    snapping.js         snapping for walls, rooms and furniture; the draft wall
  render/               S → SVG
    index.js            render(): redraws everything
    zones.js            room floors and tags
    walls.js            walls, openings, door swings
    items.js            furniture and labels
    dimensions.js       dimension strings and aligned dimensions
    overlay.js          selection, handles, live dimensions, drafts, tape
    transformBox.js     furniture transform box: handles, rotate zones, cursors
    header.js           plan summary and title block
    grid.js             background grid
  actions/
    edit.js             add, duplicate, delete, rotate, nudge, split, new / reset plan
    settings.js         tool, toggles and unit, reflected in the toolbar
  export/
    planImage.js        the plan as a PNG or JPG, with a title block
    fonts.js            inlines the plan's fonts into the image
    saveFile.js         saves a file: the viewer's downloads capability, or a browser download
  interaction/
    pointer.js          pointer input on the plan: tools, drags, pan, pinch
    wallDrag.js         moving walls and dragging selection handles
    transform.js        Free Transform for furniture: resize, rotate, snap, cancel
  ui/
    toolbar.js          toolbar buttons, undo buttons
    library.js          furniture library, drag and drop onto the plan
    inspector/          right-hand panel: one file per view, events.js for input
    dimEditor.js        the box for typing an exact dimension
    modal.js            export (PNG, JPG, JSON) and import dialog
    keyboard.js         shortcuts
    theme.js            colour theme picker
    icons.js            line icons
  styles/
    main.css            imports the others, in cascade order
    tokens.css          colours (all themes) and fonts
    …                   one file per area of the page; responsive.css last
```

There are no import cycles, and the layers build on each other in this order: `core` → `model` → `geometry` → `view` → `render` → `actions` and `export` → `interaction` and `ui` → `main.js`. Each layer imports only from layers to its left. Two parts of `ui/` sit lower down: the inspector's panel templates, which `render/index.js` draws, and the dimension editor, which `actions/settings.js` closes. Where a lower layer needs to trigger something higher up, it offers a listener instead (`onHistoryChange` in history.js, `onViewChange` in viewport.js), and `main.js` connects them.

## How it works

- **One state object.** Everything lives in `S` (`src/model/state.js`). `items`, `walls` and `rooms` are the plan, which is saved and undoable. The rest is view settings and the interaction in progress.
- **Change, commit, render.** Code changes `S` directly, calls `commit()` to record an undo step and save, then `render()` to redraw. `render()` rebuilds all the SVG from `S` and is fast enough to run on every pointer move.
- **Metres throughout.** All geometry is in metres, rounded to the micrometre by `r3()`. Snapped and typed positions land on whole millimetres, so dimension chains add up exactly. Units only change at the edges, through `fmt`, `toU` and `fromU`.
- **Walls are centrelines.** A wall runs from `(x1, y1)` to `(x2, y2)` with thickness `t`. Dimension strings measure clear sizes between inside faces, as on the original drawing.
- **Curved walls are arcs.** A non-zero `arc` bends a wall into a circular arc through its two ends: `arc` is the signed radius of the centreline, positive when the wall bows to the left of start → end as seen on the plan. `arcOf()` in `src/geometry/walls.js` turns it into the circle, and everything that needs the wall's path (outlines, snapping, clash checks, drawing) goes through it. Doors, columns and ducts stay straight.

## Common changes

- **Add a furniture piece:** add an entry to `CATALOG` in `src/model/catalog.js`. Its `draw(w, d, rot)` returns SVG markup in a local frame, centred, with the front facing +y. It shows up in the library automatically.
- **Add a wall type:** add it to `KINDS` in `src/model/wallKinds.js`, then give it a drawing in `src/render/walls.js`. Give it `arc: true` if it can curve, and draw its lines with `along()` so they bend with it.
- **Change colours or add a theme:** edit `src/styles/tokens.css` and the theme list in `src/ui/theme.js`.
