import { Workspace } from "kwin-api/qml";
import { Shortcuts } from "../../extern";
import { config, console, controller as ctrl, qt } from "..";
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
            .activated.connect(
                this.setEngineType.bind(this, TilingEngineType.BTree),
            );
        this.shortcuts
            .getSetEngineHalf()
            .activated.connect(
                this.setEngineType.bind(this, TilingEngineType.Half),
            );

        this.shortcuts
            .getActivateBelow()
            .activated.connect(
                this.activateInDirection.bind(this, Edge.BottomEdge),
            );
        this.shortcuts
            .getActivateAbove()
            .activated.connect(
                this.activateInDirection.bind(this, Edge.TopEdge),
            );
        this.shortcuts
            .getActivateLeft()
            .activated.connect(
                this.activateInDirection.bind(this, Edge.LeftEdge),
            );
        this.shortcuts
            .getActivateRight()
            .activated.connect(
                this.activateInDirection.bind(this, Edge.RightEdge),
            );

        this.shortcuts
            .getPlaceBelow()
            .activated.connect(
                this.placeInDirection.bind(this, Edge.BottomEdge),
            );
        this.shortcuts
            .getPlaceAbove()
            .activated.connect(this.placeInDirection.bind(this, Edge.TopEdge));
        this.shortcuts
            .getPlaceLeft()
            .activated.connect(this.placeInDirection.bind(this, Edge.LeftEdge));
        this.shortcuts
            .getPlaceRight()
            .activated.connect(
                this.placeInDirection.bind(this, Edge.RightEdge),
            );

        this.shortcuts
            .getResizeDown()
            .activated.connect(
                this.resizeInDirection.bind(this, Edge.BottomEdge),
            );
        this.shortcuts
            .getResizeUp()
            .activated.connect(this.resizeInDirection.bind(this, Edge.TopEdge));
        this.shortcuts
            .getResizeLeft()
            .activated.connect(
                this.resizeInDirection.bind(this, Edge.LeftEdge),
            );
        this.shortcuts
            .getResizeRight()
            .activated.connect(
                this.resizeInDirection.bind(this, Edge.RightEdge),
            );

        this.shortcuts
            .getToggleSettingsMenu()
            .activated.connect(this.toggleSettingsMenu.bind(this));
    }

    toggleActiveTiling() {
        const window = this.workspace.activeWindow;
        if (window == null) return;
        const windowHandler = ctrl().getWindowHandler(window);
        if (windowHandler == undefined) return;
        if (windowHandler.tiled) {
            windowHandler.wantsTiled = false;
            windowHandler.tiled = false;
            for (const ev of createUntileEvents(window)) {
                ctrl().queueEvent(ev);
            }
        } else {
            windowHandler.wantsTiled = true;
            windowHandler.tiled = true;
            for (const ev of createTileEvents(window)) {
                ctrl().queueEvent(ev);
            }
        }
    }

    setEngineType(engineType: TilingEngineType) {
        ctrl().queueEvent({
            t: "changeEngine",
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: this.workspace.activeScreen,
            engineType: engineType,
        });
    }

    getTileInDirection(tile: Tile, rootTile: Tile, edge: Edge): Tile | null {
        if (tile == rootTile) return null;
        let x = tile.absoluteGeometry.x;
        let y = tile.absoluteGeometry.y;
        switch (edge) {
            case Edge.BottomEdge:
                x += tile.absoluteGeometry.width / 2;
                y += tile.absoluteGeometry.height + tile.padding * 2;
                break;
            case Edge.TopEdge:
                x += tile.absoluteGeometry.width / 2;
                y -= tile.padding * 2;
                break;
            case Edge.LeftEdge:
                x -= tile.padding * 2;
                y += tile.absoluteGeometry.height / 2;
                break;
            case Edge.RightEdge:
                x += tile.absoluteGeometry.width + tile.padding * 2;
                y += tile.absoluteGeometry.height / 2;
                break;
            default:
                return null;
        }
        return rootTile.pick(qt().point(x, y));
    }

    activateInDirection(edge: Edge) {
        const currentTile = this.workspace.activeWindow?.tile;
        if (currentTile == null) return;
        let rootTile = currentTile;
        while (rootTile.parent != null) {
            rootTile = rootTile.parent!;
        }
        const targetTile = this.getTileInDirection(currentTile, rootTile, edge);
        if (targetTile == null) return;
        if (targetTile.windows.length == 0) return;
        this.workspace.activeWindow = targetTile.windows[0];
    }

    placeInDirection(edge: Edge) {
        const currentTile = this.workspace.activeWindow?.tile;
        if (currentTile == null) return;
        let rootTile = currentTile;
        while (rootTile.parent != null) {
            rootTile = rootTile.parent!;
        }
        const targetTile = this.getTileInDirection(currentTile, rootTile, edge);
        if (targetTile == null) return;
        let direction = Direction.None;
        switch (edge) {
            case Edge.TopEdge:
                direction = Direction.Vertical;
                break;
            case Edge.BottomEdge:
                direction = Direction.Down | Direction.Vertical;
                break;
            case Edge.LeftEdge:
                direction = Direction.None;
                break;
            case Edge.RightEdge:
                direction = Direction.Right;
                break;
            default:
                break;
        }
        // if the old tile x axis center is farther right (greater) than the target x axis center,
        // then set right flag as well
        if (edge & Edge.BottomEdge || edge & Edge.TopEdge) {
            const currentCenter =
                currentTile.absoluteGeometry.x +
                currentTile.absoluteGeometry.width / 2;
            const targetCenter =
                targetTile.absoluteGeometry.x +
                targetTile.absoluteGeometry.width / 2;
            if (currentCenter > targetCenter) {
                direction |= Direction.Right;
            }
        } else if (edge & Edge.LeftEdge || edge & Edge.RightEdge) {
            const currentCenter =
                currentTile.absoluteGeometry.y +
                currentTile.absoluteGeometry.height / 2;
            const targetCenter =
                targetTile.absoluteGeometry.y +
                targetTile.absoluteGeometry.height / 2;
            // same thing for left/right primary but up means smaller y
            if (currentCenter > targetCenter) {
                direction |= Direction.Down;
            }
        }
        const window = this.workspace.activeWindow!;
        ctrl().queueEvent({
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
        const currentTile = this.workspace.activeWindow?.tile;
        if (currentTile == null) return;
        let amount = config().tileResizeAmount;
        if (edge & Edge.TopEdge || edge & Edge.LeftEdge) {
            amount *= -1;
        }
        currentTile.resizeByPixels(amount, edge);
    }

    toggleSettingsMenu() {
        ctrl().queuePostEvent({
            t: "toggleSettingsMenu",
            desktop: this.workspace.currentDesktop,
            activity: this.workspace.currentActivity,
            output: this.workspace.activeScreen,
        });
    }
}
