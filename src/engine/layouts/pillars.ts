// pillars.ts - Tiling engine for the pillars layout

import { translateDirection } from "../../util/geometry";
import {
    Tile,
    Window,
    TilingEngineInterface,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";

class WindowBox {
    window: Window;
    size: number = 1;

    constructor(window: Window) {
        this.window = window;
    }
}

class Pillar {
    boxes: WindowBox[] = [];
    size: number = 1;
}

export enum InsertionStyle {
    Rows = 0,
    Snake,
    RowsUp,
    SnakeUp,
}

class PillarEngineSettings extends BaseEngineSettings {
    pillarCount: number = 3;
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
    insertInActive: boolean = false;
    insertionStyle: InsertionStyle = InsertionStyle.Rows;
}

export class PillarEngine implements TilingEngineInterface {
    tileMap: Map<Tile, WindowBox> = new Map();
    pillars: Pillar[];

    settings = new PillarEngineSettings();

    constructor() {
        this.pillars = new Array<Pillar>(this.settings.pillarCount);
        for (let i = 0; i < this.settings.pillarCount; i += 1) {
            this.pillars[i] = new Pillar();
        }
    }

    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        if (this.settings.pillarCount < 1) {
            this.settings.pillarCount = 1;
        }
        while (this.pillars.length > this.settings.pillarCount) {
            const pillar = this.pillars.pop();
            if (pillar === undefined) break;
            for (const window of pillar.boxes.map((x) => x.window)) {
                this.addWindow(window);
            }
        }
        while (this.pillars.length < this.settings.pillarCount) {
            this.pillars.push(new Pillar());
        }
    }

    buildLayout(): Tile {
        const rootTile = new Tile();
        rootTile.layoutDirection = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
        this.tileMap.clear();

        const pillarsWithWindows = this.pillars.filter(
            (p) => p.boxes.length > 0,
        );
        for (const pillar of pillarsWithWindows) {
            const pillarTile =
                pillarsWithWindows.length == 1 ? rootTile : rootTile.addChild();
            if (pillar.boxes.length == 1) {
                pillarTile.windows.push(pillar.boxes[0].window);
                this.tileMap.set(pillarTile, pillar.boxes[0]);
            } else {
                for (const box of pillar.boxes) {
                    const tile = pillarTile.addChild();
                    tile.windows.push(box.window);
                    tile.size = box.size;
                    this.tileMap.set(tile, box);
                }
            }
        }

        return rootTile;
    }

    addWindow(window: Window, tile?: Tile, direction?: Direction): void {
        if (tile !== undefined) {
            this.placeWindow(window, tile, direction);
            return;
        }
        let pillarIdx: number = 0;
        let rowIdx: number = 0;
        while (true) {
            if (this.pillars[pillarIdx].boxes.length < rowIdx) {
                this.pillars[pillarIdx].boxes.push(new WindowBox(window));
                return;
            }
            pillarIdx += 1;
            if (pillarIdx >= this.pillars.length) {
                pillarIdx = 0;
                rowIdx += 1;
            }
        }
    }

    removeWindow(window: Window) {
        const pillar = this.pillars.find((p) =>
            p.boxes.some((b) => b.window == window),
        );
        if (pillar === undefined) return;
        const box = pillar.boxes.findIndex((b) => b.window == window);
        if (box === -1) return;
        pillar.boxes.splice(box, 1);
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        // todo
        this.addWindow(window);
    }

    windowActivated(window: Window): boolean {
        return false;
    }

    updateTiles(rootTile: Tile): void {}
}
