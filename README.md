# Portrait Mode for Twitch

A Firefox add-on that copies FrankerFaceZ's **Portrait Mode** on its own, without the rest of FFZ.

When your browser window is taller than it is wide, the player sits at the top at full width and chat fills the space underneath. Widen the window again and Twitch's normal side-by-side layout comes back.

## Settings

Click the toolbar button (or open the add-on's preferences) to change these. They match FFZ's options:

| Setting | Default | What it does |
|---|---|---|
| Enable Portrait Mode | On | Turns the feature on. |
| Place chat at the top | Off | Puts chat above the player instead of below it. |
| Portrait Mode Threshold | 1.25 | Portrait Mode starts when width ÷ height is at or below this. |
| Use compact chat | Off | Smaller chat header, chat input on the same line as the chat buttons. |
| Display Side Navigation | Always | *Never*, *Always*, or *Hide in Portrait*. |

Portrait Mode applies on the same pages as FFZ: live channels, videos, clips, and a channel's videos / clips / collections / events / followers / following pages. It stays off during Watch Parties and when chat is collapsed.

## Install

**Temporary (for testing):** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and pick `manifest.json` (or the `.xpi`). It's removed when Firefox restarts.

**Permanent:** release Firefox only installs add-ons signed by Mozilla. Submit the `.xpi` to [addons.mozilla.org](https://addons.mozilla.org/developers/), choosing *On your own* for an unlisted, self-distributed signed copy, then install that signed file.

Requires Firefox 128 or newer (works in Firefox-based browsers like Zen).

## How it works

FFZ decides when to use Portrait Mode from Twitch's internal state (whether chat is expanded, theatre mode, side navigation) and its own page router. This add-on reads the same state from Twitch's React tree, using Firefox's `wrappedJSObject` to reach page objects from the content script, then applies FFZ's stylesheets with the same rules.

Differences from FFZ:
- Only the defaults of FFZ's *other* layout features are assumed (no swapped sidebars, custom chat width, minimal navigation, hidden whispers, or theatre-mode metadata).
- FFZ's compact-chat mode also hides channel point rewards next to the points button; that part relies on FFZ's chat internals and isn't included.

If you also run FrankerFaceZ, turn off one of the two Portrait Modes.

## Development

```sh
npm install
npm run build     # compile styles/*.scss into src/styles.js
npm test          # route matching and decision logic tests
npm run lint      # Mozilla's web-ext linter
npm run package   # build web-ext-artifacts/*.zip (rename to .xpi if you like)
```

## License

Apache-2.0. Derived from [FrankerFaceZ](https://github.com/FrankerFaceZ/FrankerFaceZ); see `NOTICE`. Not affiliated with FrankerFaceZ or Twitch.
