import { Workspace } from "kwin-api/qml";
import { Shortcuts } from "../../extern";
import { config, getWindowHandler, qt, queueEvent } from "..";
import { Direction, TilingEngineType } from "../../engine";
import { createTileEvents, createUntileEvents } from "../event";
import { Edge, Tile } from "kwin-api";

export class ShortcutsHandler {
    private workspace: Workspace;
    private shortcuts: Shortcuts;

    constructor(workspace: Workspace, shortcuts: Shortcuts) {
        this.workspace = workspace;
        this.shortcuts = shortcuts;

        this.shortcuts
            .getToggleActiveTiling()
            .activated.connect(this.toggleActiveTiling.bind(this));

        this.shortcuts
            .getSetEngineBTree()
            .activated.connect(this.setEngineType.bind(this, TilingEngineType.BTree));
        this.shortcuts
            .getSetEngineHalf()
            .activated.connect(this.setEngineType.bind(this, TilingEngineType.Half));

        this.shortcuts
            .getActivateBelow()
            .activated.connect(this.activateInDirection.bind(this, Edge.BottomEdge));
        this.shortcuts
            .getActivateAbove()
            .activated.connect(this.activateInDirection.bind(this, Edge.TopEdge));
        this.shortcuts
            .getActivateLeft()
            .activated.connect(this.activateInDirection.bind(this, Edge.LeftEdge));
        this.shortcuts
            .getActivateRight()
            .activated.connect(this.activateInDirection.bind(this, Edge.RightEdge));

        this.shortcuts
            .getPlaceBelow()
            .activated.connect(this.placeInDirection.bind(this, Edge.BottomEdge));
        this.shortcuts
            .getPlaceAbove()
            .activated.connect(this.placeInDirection.bind(this, Edge.TopEdge));
        this.shortcuts
            .getPlaceLeft()
            .activated.connect(this.placeInDirection.bind(this, Edge.LeftEdge));
        this.shortcuts
            .getPlaceRight()
            .activated.connect(this.placeInDirection.bind(this, Edge.RightEdge));

        this.shortcuts
            .getResizeDown()
            .activated.connect(this.resizeInDirection.bind(this, Edge.BottomEdge));
        this.shortcuts
            .getResizeUp()
            .activated.connect(this.resizeInDirection.bind(this, Edge.TopEdge));
        this.shortcuts
            .getResizeLeft()
            .activated.connect(this.resizeInDirection.bind(this, Edge.LeftEdge));
        this.shortcuts
            .getResizeRight()
            .activated.connect(this.resizeInDirection.bind(this, Edge.RightEdge));
    }

    toggleActiveTiling() {
        const window = this.workspace.activeWindow;
        if (window == null) return;
        const windowHandler = getWindowHandler(window);
        if (windowHandler == undefined) return;
        if (windowHandler.tiled) {
            windowHandler.wantsTiled = false;
            windowHandler.tiled = false;
            for (const ev of createUntileEvents(window)) {
                queueEvent(ev);
            }
        } else {
            windowHandler.wantsTiled = true;
            windowHandler.tiled = true;
            for (const ev of createTileEvents(window)) {
                queueEvent(ev);
            }
        }
    }

    setEngineType(engineType: TilingEngineType) {
        queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: this.workspace.activeScreen,
            engineType: engineType,
        });
    }

    getTileAbove(tile: Tile, rootTile: Tile): Tile | null {
        // no tile above if this tile is root
        if (tile == rootTile) return null;
        let x = tile.absoluteGeometry.x + (tile.absoluteGeometry.width / 2);
        let y = tile.absoluteGeometry.y - (tile.padding * 2);
        return rootTile.pick(qt().point(x, y));
    }
    getTileBelow(tile: Tile, rootTile: Tile): Tile | null {
        // no tile above if this tile is root
        if (tile == rootTile) return null;
        let x = tile.absoluteGeometry.x + (tile.absoluteGeometry.width / 2);
        let y = tile.absoluteGeometry.y + tile.absoluteGeometry.height + (tile.padding * 2);
        return rootTile.pick(qt().point(x, y));
    }
    getTileLeft(tile: Tile, rootTile: Tile): Tile | null {
        // no tile above if this tile is root
        if (tile == rootTile) return null;
        let x = tile.absoluteGeometry.x - (tile.padding * 2);
        let y = tile.absoluteGeometry.y + (tile.absoluteGeometry.height / 2);
        return rootTile.pick(qt().point(x, y));
    }
    getTileRight(tile: Tile, rootTile: Tile): Tile | null {
        // no tile above if this tile is root
        if (tile == rootTile) return null;
        let x = tile.absoluteGeometry.x + tile.absoluteGeometry.width + (tile.padding * 2);
        let y = tile.absoluteGeometry.y + (tile.absoluteGeometry.height / 2);
        return rootTile.pick(qt().point(x, y));
    }

    activateInDirection(edge: Edge) {
        const currentWindowTile = this.workspace.activeWindow?.tile;
        if (currentWindowTile == null) return;
        let rootTile = currentWindowTile;
        while (rootTile.parent != null) {
            rootTile = rootTile.parent!;
        }
        let targetTile = null;
        switch (edge) {
            case Edge.TopEdge:
                targetTile = this.getTileAbove(currentWindowTile, rootTile);
                break;
            case Edge.BottomEdge:
                targetTile = this.getTileBelow(currentWindowTile, rootTile);
                break;
            case Edge.LeftEdge:
                targetTile = this.getTileLeft(currentWindowTile, rootTile);
                break;
            case Edge.RightEdge:
                targetTile = this.getTileRight(currentWindowTile, rootTile);
                break;
            default: break;
        }
        if (targetTile == null) return;
        if (targetTile.windows.length == 0) return;
        this.workspace.activeWindow = targetTile.windows[0];
    }

    placeInDirection(edge: Edge) {
        const currentWindowTile = this.workspace.activeWindow?.tile;
        if (currentWindowTile == null) return;
        let rootTile = currentWindowTile;
        while (rootTile.parent != null) {
            rootTile = rootTile.parent!;
        }
        let targetTile = null;
        let direction = null;
        switch (edge) {
            case Edge.TopEdge:
                targetTile = this.getTileAbove(currentWindowTile, rootTile);
                direction = Direction.Up | Direction.Vertical;
                break;
            case Edge.BottomEdge:
                targetTile = this.getTileBelow(currentWindowTile, rootTile);
                direction = Direction.Vertical;
                break;
            case Edge.LeftEdge:
                targetTile = this.getTileLeft(currentWindowTile, rootTile);
                direction = Direction.None;
                break;
            case Edge.RightEdge:
                targetTile = this.getTileRight(currentWindowTile, rootTile);
                direction = Direction.Right;
                break;
            default: break;
        }
        if (targetTile == null || direction == null) return;
        const window = this.workspace.activeWindow!;
        queueEvent({
            t: "placeWindow",
            window: window,
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: window.output,
            tile: targetTile,
            direction: direction,
        });
    }

    resizeInDirection(edge: Edge) {
        const currentWindowTile = this.workspace.activeWindow?.tile;
        if (currentWindowTile == null) return;
        let amount = config().tileResizeAmount;
        if ((edge & Edge.TopEdge) || (edge & Edge.LeftEdge)) {
            amount *= -1;
        }
        currentWindowTile.resizeByPixels(amount, edge);
    }
}
