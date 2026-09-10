# Interaction Lab

This folder stores interaction prototypes that are not part of the live site UI.

## LiquidSurfaceNavHub.astro

Archived from the former Works/navigation hub. It contains the liquid surface-tension cursor attraction interaction and the video-backed canvas navigation pills.

Keep this component as a reusable interaction reference for future sections, experiments, or project-detail controls.

### Note on `showcase-bg.mp4`

The 15 MB background video used by this prototype was moved out of `public/` to
`archive/showcase-bg.mp4`, because everything inside `public/` is copied verbatim into
`dist/` on every build — including files that no live page references.

To revive this prototype, copy the file back first:

```sh
cp archive/showcase-bg.mp4 public/showcase-bg.mp4
```

