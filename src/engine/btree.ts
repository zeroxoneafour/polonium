import { BiMap } from "mnemonist";
import { printDebug } from "../util";
import { Desktop } from "./common";
import * as Engine from "./common";

class TreeNode {
    parent: TreeNode | null = null;
    sibling: TreeNode | null = null;
    children: [TreeNode, TreeNode] | null = null;
    client: KWin.AbstractClient | null = null;
    // the offset of the split between the children in ratio (1 is full tile and shouldnt ever happen), so tiles can have different shapes
    splitOffset: number = 0.5;
    // splits tile
    split(): void {
        // cannot already have children
        if (this.children != null) return;
        this.children = [new TreeNode, new TreeNode]
        this.children[0].parent = this;
        this.children[0].sibling = this.children[1];
        this.children[1].parent = this;
        this.children[1].sibling = this.children[0];
    }
    // removes self
    remove(): void {
        // cannot have children or be root
        if (this.children != null || this.sibling == null || this.parent == null) return;
        // if sibling has children, move them to the parent and leave both siblings to be garbage collected
        if (this.sibling.children != null) {
            this.parent.children = this.sibling.children;
            for (const child of this.parent.children) {
                // help the adoption
                child.parent = this.parent;
            }

        } else { // otherwise just move windows over
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
        this.splitOffset = 0.5;
    }
}

export class TilingEngine implements Engine.TilingEngine {
    // turn the desktop into a string first so its indexed by primitive instead of reference
    rootNodes: Map<string, RootNode> = new Map;
    // changed when desktop is changed
    nodeMap: BiMap<TreeNode, KWin.Tile> = new BiMap;
    
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): void {
        // disconnect layout modified signal temporarily to stop them from interfering
        rootTile.layoutModified.disconnect(this.updateTile);
        // set up
        this.nodeMap = new BiMap;
        printDebug("" + this.rootNodes.has(desktop.toString()), false);
        if (!this.rootNodes.has(desktop.toString())) {
            printDebug("Making new rootNode for desktop", false);
            this.rootNodes.set(desktop.toString(), new RootNode);
        }
        const rootNode = this.rootNodes.get(desktop.toString())!;
        // wipe rootTile clean
        while (rootTile.tiles.length > 0) {
            rootTile.tiles[0].remove();
        };
        // modify rootTile
        let stack: Array<TreeNode> = [rootNode];
        let stackNext: Array<TreeNode> = [];
        this.nodeMap.set(rootNode, rootTile);
        let i = 0;
        while (stack.length > 0) {
            for (const node of stack) {
                if (node.children != null) {
                    const tile = this.nodeMap.get(node);
                    printDebug("" + tile, false);
                    if (tile == null) {
                        printDebug("No tile found for node", true);
                        continue;
                    }
                    tile.split((i % 2) + 1);
                    let j = 0;
                    for (const child of node.children) {
                        tile.tiles[j].oldRelativeGeometry = tile.tiles[j].relativeGeometry;
                        this.nodeMap.set(child, tile.tiles[j]);
                        stackNext.push(child);
                        j += 1;
                    }
                }
            }
            stack = stackNext;
            stackNext = [];
            i += 1;
        }
        // reconnect updateTile
        rootTile.layoutModified.connect(this.updateTile);
    }
    // man would it be easy if i could just pass the tile in...
    updateTile(): void {
        const rootNode = this.rootNodes.get((new Desktop).toString());
        if (rootNode == undefined) {
            printDebug("No root node detected for tile update", true);
            return;
        }
        const rootTile = this.nodeMap.get(rootNode);
        if (rootTile == undefined) {
            printDebug("No tile found for root node", true);
            return;
        }
        // find the greatest tile that has been altered
        let stack: Array<KWin.Tile> = [];
        for (const child of rootTile.tiles) {
            stack.push(child);
        }
        let stackNext: Array<KWin.Tile> = [];
        while (stack.length > 0) {
            stack = stackNext;
            stackNext = [];
        }
    }
    placeClients(desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile]> {
        let ret = new Array<[KWin.AbstractClient, KWin.Tile]>;
        const rootNode = this.rootNodes.get(desktop.toString());
        if (rootNode == null) {
            printDebug("Root node null for desktop " + desktop, true);
            return ret;
        }
        // i love copy and paste this is why i develop software
        let stack: Array<TreeNode> = [rootNode];
        let stackNext: Array<TreeNode> = [];
        while (stack.length > 0) {
            for (const node of stack) {
                if (node.client != null) {
                    let tile = this.nodeMap.get(node);
                    if (tile == null) {
                        printDebug("No tile found for node", true);
                        continue;
                    }
                    ret.push([node.client, tile]);
                }
                if (node.children != null) {
                    for (const child of node.children) {
                        stackNext.push(child);
                    }
                }
            }
            stack = stackNext;
            stackNext = [];
        }
        return ret;
    }
    addClient(client: KWin.AbstractClient): void {
        for (const activity of client.activities) {
            const desktop = new Desktop;
            desktop.screen = client.screen;
            desktop.activity = activity;
            desktop.desktop = client.desktop;
            if (!this.rootNodes.has(desktop.toString())) {
                printDebug("Making new rootNode for desktop", false);
                this.rootNodes.set(desktop.toString(), new RootNode);
            }
            const rootNode = this.rootNodes.get(desktop.toString())!;
            // truly this is the peak of programming
            let stack: Array<TreeNode> = [rootNode];
            let stackNext: Array<TreeNode> = [];
            stackloop: while (stack.length > 0) {
                for (const node of stack) {
                    if (node.children == null) {
                        if (node.client != null) { // case for basically all non-root tiles
                            node.split();
                            node.children![0].client = node.client;
                            node.children![1].client = client;
                            node.client = null;
                        } else { // just add the client
                            node.client = client;
                        }
                        break stackloop;
                    } else {
                        for (const child of node.children) {
                            stackNext.push(child);
                        }
                    }
                }
                stack = stackNext;
                stackNext = [];
            }
        }
    }
    updateClientDesktop(client: KWin.AbstractClient): void {
        // if this works im keeping this until release tbh
        this.removeClient(client);
        this.addClient(client);
    }
    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile): void {
        // assumes the nodemap has been built correctly
        const node = this.nodeMap.inverse.get(tile);
        if (node == undefined) {
            printDebug("No node found for tile", true);
            return;
        }
        if (node.client == null) {
            node.client = client;
        } else {
            node.split();
            node.children![0].client = node.client;
            node.children![1].client = client;
            node.client = null;
        }
    }
    // cant copy code because indexed by string not object
    removeClient(client: KWin.AbstractClient): void {
        for (const rootNode of this.rootNodes.values()) {
            let stack: Array<TreeNode> = [rootNode];
            let stackNext: Array<TreeNode> = [];
            let deleteQueue: Array<TreeNode> = [];
            while (stack.length > 0) {
                for (const node of stack) {
                    if (node.client == client) {
                        deleteQueue.push(node);
                    }
                    if (node.children != null) {
                        for (const child of node.children) {
                            stackNext.push(child);
                        }
                    }
                }
                stack = stackNext;
                stackNext = [];
            }
            for (const node of deleteQueue) {
                node.remove();
            }
        }
    }
}
