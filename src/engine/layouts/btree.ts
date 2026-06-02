// engine/layouts/btree.ts - Implementation of binary tree layout

import {
    TilingEngineInterface,
    Tile,
    Window,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";
import { Queue } from "../../util/queue";
import { console } from "../../controller";

class BTreeSettings extends BaseEngineSettings {
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
}

class Node {
    parent: Node | null = null;
    children: [Node, Node] | null = null;
    window: Window | null = null;
    size: number = 1;

    layoutDirectionRoot: LayoutDirection = LayoutDirection.Horizontal;
    get layoutDirection(): LayoutDirection {
        if (this.parent === null) {
            return this.layoutDirectionRoot;
        }
        if (this.parent.layoutDirection == LayoutDirection.Horizontal) {
            return LayoutDirection.Vertical;
        } else {
            return LayoutDirection.Horizontal;
        }
    }

    constructor(parent?: Node) {
        if (parent) {
            this.parent = parent;
        }
    }

    split(windowInheritor: 0 | 1): void {
        if (this.children !== null) {
            return;
        }
        this.children = [new Node(this), new Node(this)];
        this.children[windowInheritor].window = this.window;
        this.window = null;
    }

    // don't call this if a window exists in that tile
    // or I guess you could call it but it would untile the window
    destroy(): void {
        // cannot destroy root node
        if (this.parent === null || this.parent.children === null) {
            return;
        }
        const sibling =
            this.parent.children[0] === this
                ? this.parent.children[1]
                : this.parent.children[0];
        if (sibling.window !== null) {
            this.parent.window = sibling.window;
        }
        this.parent.children =
            sibling.children === null ? null : [...sibling.children];
        for (const child of this.parent.children ?? []) {
            child.parent = this.parent;
        }
    }
}

export default class BTreeEngine implements TilingEngineInterface {
    settings: BTreeSettings = new BTreeSettings();
    getEngineSettings(): object {
        return this.settings.getProps();
    }
    setEngineSettings(settings: object): void {
        this.settings.setProps(settings);
        this.root.layoutDirectionRoot = this.settings.rotateLayout
            ? LayoutDirection.Vertical
            : LayoutDirection.Horizontal;
    }

    root: Node = new Node();
    tileMap: Map<Tile, Node> = new Map();

    buildLayout(): Tile {
        const queue = new Queue<[Node, Tile]>();
        const rootTile = new Tile();
        this.tileMap.clear();
        queue.push([this.root, rootTile]);
        while (!queue.isEmpty) {
            const [node, tile] = queue.pop()!;
            this.tileMap.set(tile, node);
            if (node.window !== null) tile.windows.push(node.window);
            tile.size = node.size;
            tile.layoutDirection = node.layoutDirection;
            if (node.children !== null) {
                const [child1, child2] = node.children;
                const tile1 = tile.addChild();
                const tile2 = tile.addChild();
                queue.push([child1, tile1]);
                queue.push([child2, tile2]);
            }
        }
        return rootTile;
    }

    addWindow(window: Window): void {
        // no windows case
        if (this.root.window === null && this.root.children === null) {
            this.root.window = window;
            return;
        }
        const queue = new Queue<Node>();
        queue.push(this.root);
        while (!queue.isEmpty) {
            const node = queue.pop()!;
            if (node.window !== null) {
                node.split(this.settings.swapInsertSide ? 1 : 0);
                node.children![this.settings.swapInsertSide ? 0 : 1].window =
                    window;
                return;
            } else {
                if (node.children !== null) {
                    queue.multipush(node.children);
                }
            }
        }
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        const node = this.tileMap.get(tile);
        if (node == undefined) return;
        if (node.window === null) {
            node.window = window;
            return;
        }
        let insertPoint = this.settings.swapInsertSide ? 0 : 1;
        if (direction !== undefined) {
            insertPoint =
                node.layoutDirection === LayoutDirection.Horizontal
                    ? direction & Direction.Right
                        ? 1
                        : 0
                    : direction & Direction.Up
                      ? 0
                      : 1;
        }
        node.split(insertPoint === 0 ? 1 : 0);
        node.children![insertPoint].window = window;
    }

    removeWindow(window: Window): void {
        if (this.root.window === window) {
            this.root.window = null;
            return;
        }
        const queue = new Queue<Node>();
        queue.push(this.root);
        while (!queue.isEmpty) {
            const node = queue.pop()!;
            if (node.window === window) {
                node.destroy();
                return;
            } else {
                if (node.children !== null) {
                    queue.multipush(node.children);
                }
            }
        }
    }

    updateTiles(_rootTile: Tile): void {
        for (const [tile, node] of this.tileMap) {
            node.size = tile.size;
        }
    }
}
