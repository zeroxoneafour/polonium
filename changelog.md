# changelog

## 0.5.0

### 0.5.1
* Added an optional direction parameter to `TilingEngine.putClientInTile` and most descending classes
* Added code to set geometry of windows when not active to preserve their shape
* Added directional placement when dragging windows for more dragging predictability
* Added directional placement when using shortcuts for more predictability
* Fixed rare issue with TypeScript not allowing no parentheses `new Array<T>` statements
* Rewrote much of the project internals around using QML as the main script type
* Added new popup for when the tiling engine is switched
