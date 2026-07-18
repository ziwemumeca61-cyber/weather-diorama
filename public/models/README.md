# GLB landmark models

Drop `.glb` files here and reference them from a city profile in
`src/scene/cityProfiles.ts`. Draco-compressed models are supported — the
decoder is self-hosted in `public/draco/` (copied from three.js), so nothing is
fetched from a CDN at runtime.

## Add a model to a city

```ts
// src/scene/cityProfiles.ts
{
  id: 'paris',
  match: /巴黎|paris/i,
  models: [
    { url: 'models/eiffel.glb', position: [-1.5, 0, -2], scale: 0.5, rotationY: 0.3 },
    // add more entries to place several models
  ],
  credit: 'Eiffel Tower · Author · CC-BY 4.0', // shown on-screen if set
  clearZones: [{ x: -1.5, z: -2, r: 4 }],           // keep buildings off the footprint
  calmZones: [{ x: -1.5, z: -2, r: 7, maxHeight: 2 }], // cap nearby building height
}
```

- `url` is relative to the app base (`models/...`).
- `scale` is a uniform number or `[x, y, z]`; tune it against the diorama,
  where the city spans roughly ±10 units and towers reach ~9 units tall.
- Built-in animation clips play automatically (`animate: false` to disable).
- If a model fails to load, the profile's procedural `Landmarks` render instead
  (a profile can supply both).

## Bundled assets

- `kenney/b00.glb … b19.glb` — buildings from Kenney's **City Kit**, licensed
  **CC0 1.0** (public domain, no attribution required). Composed into the
  fallback "modeled downtown" (`src/scene/landmarks/Cc0Downtown.tsx`) that any
  city without a bespoke profile shows — search e.g. Paris / 广州.
- `littlest-tokyo.glb` — "Littlest Tokyo" by
  [Glen Fox](https://artstation.com/glenatron), licensed **CC-BY 4.0**, via the
  three.js examples; the built-in demo for the Tokyo profile (search 東京 /
  Tokyo). Credit is shown on-screen. Replace or remove it freely.
