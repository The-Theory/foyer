# Foyer

A new tab page for Firefox that you lay out yourself: a grid of even squares holding links, groups of links, a clock, weather and notes. It loads from the extension itself, so it opens instantly and works offline.

## Using it

- **Edit:** press <kbd>Esc</kbd> or <kbd>⌘ E</kbd> / <kbd>Ctrl E</kbd>, or hold down on an empty part of the page.
- **Add a tile:** click an empty square, or drag across several for a bigger one, then pick what goes in it. Pasting or dropping an address adds a link.
- **Move or resize:** drag a tile to move it, drag its edges or corners to resize it. With the keyboard, press <kbd>Space</kbd> on a tile, then use the arrow keys to move it and <kbd>Shift</kbd> plus arrows to resize it.
- **Change how things look:** with nothing selected, the panel changes the whole page. Click a tile to change only that one, or Shift-click to change several together.
- **Find anything:** start typing on the page to search your links and the web.
- Press <kbd>?</kbd> for every shortcut.

## Custom CSS

Page settings → Custom CSS takes any CSS you like, for anything the settings can't do. Your rules load after Foyer's own, so they win. Mistakes can't break anything: delete the rule and the page goes back to how it was.

### What you can target

| Selector | What it is |
| --- | --- |
| `.tile` | Every tile |
| `[data-kind="link"]` | Tiles of one kind: `link`, `group`, `clock`, `weather` or `note` |
| `[data-tile="…"]` | One tile. Its exact selector is at the bottom of that tile's settings |
| `.icon`, `.label` | Site icons and their names |
| `.group h2` | A group's name |
| `.time`, `.date` | The clock's time and date |
| `.temp`, `.cond` | The temperature and the conditions |
| `.note` | The text area of a note |
| `body` | The page behind the tiles |
| `.editing` | Present on the page while you're editing, for styles that should only show then |

### Values you can reuse

| Variable | What it holds |
| --- | --- |
| `--cell` | The size of one grid square, in pixels |
| `--text` | The text color |
| `--fill` | The tile background |
| `--radius` | The corner rounding |

Sizes based on `--cell` stay in proportion when the window or the number of squares changes, for example `padding: calc(var(--cell) * .1)`.

### Examples

```css
/* Outline every tile */
.tile {
  outline: 1px solid #ffffff30;
}

/* Bold clock */
.time {
  font-weight: 600;
}

/* Hide the date */
.date {
  display: none;
}

/* Grow icons on hover */
[data-kind="link"] .item:hover .icon {
  scale: 1.1;
}

/* One tile in a different color (copy the selector from that tile's settings) */
[data-tile="a1b2c3d4"] {
  --fill: #2b4a6f;
}
```

## Building

```bash
npm install
npm run dev       # in a normal browser tab, saving to localStorage
npm run firefox   # build and open in a temporary Firefox profile
npm run package   # build a zip into release/
```

To sign it for permanent install, get API credentials from [addons.mozilla.org](https://addons.mozilla.org/developers/addon/api/key/), bump `version` in `public/manifest.json`, then:

```bash
WEB_EXT_API_KEY='…' WEB_EXT_API_SECRET='…' npm run sign
```
