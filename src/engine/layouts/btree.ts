// engine/layouts/btree.ts - Implementation of binary tree layout

import {
    TilingEngineInterface,
    Tile,
    Window,
    Direction,
    BaseEngineSettings,
    LayoutDirection,
} from "../engine";
import { Queue, Stack, StackLike } from "../../util";
import { console } from "../../controller";

class BTreeSettings extends BaseEngineSettings {
    swapInsertSide: boolean = false;
    rotateLayout: boolean = false;
    insertionStyle: InsertionStyle = InsertionStyle.Shallow;
    insertInActive: boolean = false;
}

class Node {
    parent: Node | null = null;
    children: [Node, Node] | null = null;
    window: Window | null = null;
    size: number = 1;
    destroyed: boolean = false;

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
        this.destroyed = true;
        sibling.destroyed = true;
    }
}

export enum InsertionStyle {
    Shallow = 0,
    Dwindle,
    Spiral,
}

export class BTreeEngine implements TilingEngineInterface {
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
    windowSet: Set<Window> = new Set();

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
        if (this.windowSet.has(window)) return;
        this.windowSet.add(window);
        // no windows case
        if (this.root.window === null && this.root.children === null) {
            this.root.window = window;
            return;
        }
        const queue: StackLike<Node> =
            this.settings.insertionStyle === InsertionStyle.Shallow
                ? new Queue<Node>()
                : new Stack<Node>();
        queue.push(this.root);
        let i = 0;
        while (!queue.isEmpty) {
            const node = queue.pop()!;
            let swapInsertSide = this.settings.swapInsertSide;
            // spiral does depth-first, toggling insert side every two inserts
            // on default insert side, should insert right, then down, then left, then up
            if (this.settings.insertionStyle === InsertionStyle.Spiral) {
                if (i % 4 > 1) {
                    swapInsertSide = !swapInsertSide;
                }
            }
            if (node.window !== null) {
                node.split(swapInsertSide ? 1 : 0);
                node.children![swapInsertSide ? 0 : 1].window = window;
                return;
            } else {
                if (node.children !== null) {
                    const children = [...node.children];
                    if (swapInsertSide) {
                        children.reverse();
                    }
                    queue.multipush(children);
                    i += 1;
                }
            }
        }
    }

    placeWindow(window: Window, tile: Tile, direction?: Direction) {
        if (this.windowSet.has(window)) {
            // nothing to do if inserting into place it already exists
            if (tile.windows.includes(window)) {
                return;
            }
            this.removeWindow(window);
        }
        this.windowSet.add(window);
        let node: Node | null | undefined = this.tileMap.get(tile);
        console().debug(node);
        if (node == undefined) return;
        if (node.destroyed) {
            // chance that the call to removeWindow destroyed the node
            // in this case, try for parent
            node = node.parent;
            if (node == null) return;
        }
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
                    : direction & Direction.Down
                      ? 1
                      : 0;
        }
        node.split(insertPoint === 0 ? 1 : 0);
        node.children![insertPoint].window = window;
    }

    removeWindow(window: Window): void {
        if (!this.windowSet.has(window)) {
            return;
        }
        this.windowSet.delete(window);
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
