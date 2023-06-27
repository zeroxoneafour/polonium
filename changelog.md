# changelog

## 0.5.0

### 0.5.2
* Fixed QTimer undefined bug
* Added fullscreen handler on a per-window basis
* Website redesign from @HimDek
* Added rudimentary monocle layout
* Refactored some stuff to use more per-window signals instead of global kwin ones
* Basic support for quick tile shortcuts and quick tiling
* Windows return to roughly where they were previously when tiling and retiling

### 0.5.1
* Added an optional direction parameter to `TilingEngine.putClientInTile` and most descending classes
* Added code to set geometry of windows when not active to preserve their shape
* Added directional placement when dragging windows for more dragging predictability
* Added directional placement when using shortcuts for more predictability
* Fixed rare issue with TypeScript not allowing no parentheses `new Array<T>` statements
* Rewrote much of the project internals around using QML as the main script type
* Added new popup for when the tiling engine is switched
* Use esbuild instead of tsc to compile and added typescript to npm dependencies
* Fix up some issues with overextending tiling when resizing with shortcuts
* Added section to FAQ about moving windows while keeping them tiled
* Replaced limitations section of readme with info about X11
* Insert starting on right with ThreeColumn
* Added partial side insertion to ThreeColumn and Half to get around missing columns
* Added private to package.json
* Set fallback tiling engine to KWin
