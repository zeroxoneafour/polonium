// layouts/btree.ts - Implementation of binary tree layout

import { Tile, Client, TilingEngine, EngineCapability } from "../engine";
import { Direction } from "../../util/geometry";
import { GSize } from "../../util/geometry";
import { InsertionPoint } from "../../util/config";
import BiMap from "mnemonist/bi-map";
import Queue from "mnemonist/queue";

class TreeNode {
    parent: TreeNode | null = null;
    sibling: TreeNode | null = null;
    children: [TreeNode, TreeNode] | null = null;
    client: Client | null = null;
    requestedSize: GSize = new GSize();
    // splits tile
    split(): void {
        // cannot already have children
        if (this.children != null) return;
        this.children = [new TreeNode(), new TreeNode()];
        this.children[0].parent = this;
        this.children[0].sibling = this.children[1];
        this.children[1].parent = this;
        this.children[1].sibling = this.children[0];
    }
    // removes self
    remove(): void {
        // cannot have children or be root
        if (
            this.children != null ||
            this.sibling == null ||
            this.parent == null
        )
            return;
        // if sibling has children, move them to the parent and leave both siblings to be garbage collected
        if (this.sibling.children != null) {
            this.parent.children = this.sibling.children;
            for (const child of this.parent.children) {
                // help the adoption
                child.parent = this.parent;
            }
        } else {
            // otherwise just move windows over
            this.parent.client = this.sibling.client;
            this.parent.children = null;
        }
        // say goodbye
        this.parent = null;
        this.sibling.parent = null;
        this.sibling.sibling = null;
        this.sibling = null;
    }
}

class RootNode extends TreeNode {
    parent: null = null;
    sibling: null = null;
    remove(): void {
        // for root node, if the node needs to be removed just reset it
        this.children = null;
        this.client = null;
    }
}

export default class BTreeEngine extends TilingEngine {
    engineCapability = EngineCapability.None;
    private rootNode: RootNode = new RootNode();
    private nodeMap: BiMap<TreeNode, Tile> = new BiMap();

    // no engine settings for btree
    engineSettings = {};

    buildLayout() {
        // set original tile direction based on rotating layout or not
        this.rootTile = new Tile();
        this.rootTile.layoutDirection = this.config.rotateLayout ? 2 : 1;
        // set up
        this.nodeMap = new BiMap();
        // modify rootTile
        let queue: Queue<TreeNode> = new Queue();
        queue.enqueue(this.rootNode);
        this.nodeMap.set(this.rootNode, this.rootTile);
        while (queue.size > 0) {
            const node = queue.dequeue()!;
            const tile = this.nodeMap.get(node)!;
            tile.requestedSize = node.requestedSize;

            if (node.client != null) {
                tile.client = node.client;
            }
            if (node.children != null) {
                tile.split();

                this.nodeMap.set(node.children[0], tile.tiles[0]);
                this.nodeMap.set(node.children[1], tile.tiles[1]);

                queue.enqueue(node.children[0]);
                queue.enqueue(node.children[1]);
            }
        }
    }

    addClient(client: Client) {
        let queue: Queue<TreeNode> = new Queue();
        queue.enqueue(this.rootNode);
        while (queue.size > 0) {
            const node = queue.dequeue()!;
            if (node.children == null) {
                if (node.client != null) {
                    node.split();
                    if (this.config.insertionPoint == InsertionPoint.Left) {
                        node.children![0].client = client;
                        node.children![1].client = node.client;
                    } else {
                        node.children![0].client = node.client;
                        node.children![1].client = client;
                    }
                    node.client = null;
                } else {
                    node.client = client;
                }
                return;
            } else {
                const children = Array.from(node.children);
                if (this.config.insertionPoint == InsertionPoint.Right) {
                    children.reverse();
                }
                for (const child of children) {
                    queue.enqueue(child);
                }
            }
        }
    }

    removeClient(client: Client) {
        let queue: Queue<TreeNode> = new Queue();
        queue.enqueue(this.rootNode);
        let deleteQueue: TreeNode[] = [];
        while (queue.size > 0) {
            const node = queue.dequeue()!;
            if (node.client == client) {
                deleteQueue.push(node);
            }
            if (node.children != null) {
                for (const child of node.children) {
                    queue.enqueue(child);
                }
            }
        }
        for (const node of deleteQueue) {
            node.remove();
        }
    }

    putClientInTile(client: Client, tile: Tile, direction?: Direction) {
        const node = this.nodeMap.inverse.get(tile);
        if (node == undefined) {
            throw new Error("Node not found for tile");
        }
        if (node.client == null) {
            node.client = client;
        } else {
            node.split();
            // put new client in zeroth child, else put in first child
            let putClientInZero = false;
            if (direction != undefined) {
                if (tile.layoutDirection == 1) {
                    // horizontal
                    if (!(direction & Direction.Right)) {
                        putClientInZero = true;
                    }
                } // vertical hopefully
                else {
                    if (direction & Direction.Up) {
                        putClientInZero = true;
                    }
                }
            }
            if (putClientInZero) {
                node.children![0].client = client;
                node.children![1].client = node.client;
            } else {
                node.children![0].client = node.client;
                node.children![1].client = client;
            }
            node.client = null;
        }
    }

    regenerateLayout() {
        // just for checking resizing mostly
        for (const node of this.nodeMap.keys()) {
            const tile = this.nodeMap.get(node)!;
            if (tile.requestedSize != null) {
                node.requestedSize = new GSize(tile.requestedSize);
            }
        }
    }
}
