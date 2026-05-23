// engine/layouts/btree.ts - Implementation of binary tree layout

import { TilingEngineInterface, EngineParameters, Tile, Window } from "../engine";
import { GRect } from "../../util/geometry";
import { QPoint } from "kwin-api/qt";
import { Queue } from "../../util/queue";
import { LayoutDirection } from "kwin-api";
import { console } from "../../controller";

class Node {
    parent: Node | null = null;
    children: [Node, Node] | null = null;
    window: Window | null = null;

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
        const sibling = this.parent.children[0] === this ? this.parent.children[1] : this.parent.children[0];
        if (sibling.window !== null) {
            this.parent.window = sibling.window;
        }
        this.parent.children = sibling.children === null ? null : [...sibling.children];
        for (const child of this.parent.children ?? []) {
            child.parent = this.parent;
        }

        // null everything so hopefully gc gets it
        // never mind its got it probably
        /*
        sibling.window = null;
        sibling.children = null;
        sibling.parent = null;
        this.parent = null;
        this.children = null;
        this.window = null;
        */
    }
}

export default class BTreeEngine implements TilingEngineInterface {
    // make up some bs idrk about ts rn
    parameters: EngineParameters = new EngineParameters(new GRect({ x: 0, y: 0, width: 100, height: 100 }));
    get engineParameters(): EngineParameters {
        return this.parameters;
    }
    set engineParameters(params: EngineParameters) {
        this.parameters = params;
    }

    settings: object = {};
    get customSettings(): object {
        return this.settings;
    }
    set customSettings(settings: object) {
        this.settings = settings;
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

    addWindow(window: Window, insertionPoint?: QPoint): void {
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
                node.split(0);
                node.children![1].window = window;
                return;
            } else {
                if (node.children !== null) {
                    queue.multipush(node.children);
                }
            }
        }
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

    // I will do this later maybe
    updateTiles(rootTile: Tile): void {}
}