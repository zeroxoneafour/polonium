// the reference binary tree based engine

import { BiMap } from "mnemonist";
import copy from "fast-copy";
import { printDebug, config } from "../util";
import * as Engine from "./common";

class TreeNode {
    parent: TreeNode | null = null;
    sibling: TreeNode | null = null;
    children: [TreeNode, TreeNode] | null = null;
    client: KWin.AbstractClient | null = null;
    // the ratio between the size of the children nodes relative to parent. >0.5 means first child is bigger, <0.5 means smaller
    childRatio: number = 0.5;
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
        this.childRatio = 0.5;
    }
}

export class TilingEngine implements Engine.TilingEngine {
    // turn the desktop into a string first so its indexed by primitive instead of reference
    rootNode: RootNode = new RootNode;
    // changed when desktop is changed
    nodeMap: BiMap<TreeNode, KWin.Tile> = new BiMap;
    
    buildLayout(rootTile: KWin.RootTile): boolean {
        // set up
        this.nodeMap = new BiMap;
        // modify rootTile
        let stack: Array<TreeNode> = [this.rootNode];
        let stackNext: Array<TreeNode> = [];
        this.nodeMap.set(this.rootNode, rootTile);
        let i = 0;
        while (stack.length > 0) {
            for (const node of stack) {
                if (node.children != null) {
                    const tile = this.nodeMap.get(node);
                    if (tile == null) {
                        printDebug("No tile found for node", true);
                        continue;
                    }
                    // magic
                    tile.split((i % 2) + 1);
                    // first child
                    if (i % 2 == 0) { // modify width
                        tile.tiles[0].relativeGeometry.width = tile.relativeGeometry.width * node.childRatio;
                    } else { // height
                        tile.tiles[0].relativeGeometry.height = tile.relativeGeometry.height * node.childRatio;
                    }
                    tile.tiles[0].oldRelativeGeometry = copy(tile.tiles[0].relativeGeometry);
                    this.nodeMap.set(node.children[0], tile.tiles[0]);
                    stackNext.push(node.children[0]);
                    
                    // second child
                    if (i % 2 == 0) { // width
                        tile.tiles[1].relativeGeometry.width = tile.relativeGeometry.width * (1 - node.childRatio);
                    } else { // height
                        tile.tiles[1].relativeGeometry.height = tile.relativeGeometry.height * (1 - node.childRatio);
                    }
                    tile.tiles[1].oldRelativeGeometry = copy(tile.tiles[1].relativeGeometry);
                    this.nodeMap.set(node.children[1], tile.tiles[1]);
                    stackNext.push(node.children[1]);
                }
            }
            stack = stackNext;
            stackNext = [];
            i += 1;
        }
        return true;
    }
    
    // man would it be easy if i could just pass the tile in...
    updateTiles(rootTile: KWin.RootTile): boolean {
        // find the greatest tile that has been altered
        let stack: Array<KWin.Tile> = [rootTile];
        let stackNext: Array<KWin.Tile> = [];
        // the node that is the parent of the altered children
        let modifiedNode: TreeNode | null = null;
        findloop: while (stack.length > 0) {
            for (const tile of stack) {
                if (tile.oldRelativeGeometry != undefined) {
                    const geometry = tile.relativeGeometry;
                    const oldGeometry = tile.oldRelativeGeometry;
                    if (geometry.width != oldGeometry.width || geometry.height != oldGeometry.height) {
                        const modifiedTile = tile.parent;
                        // should never happen
                        if (modifiedTile == null) {
                            printDebug("Parent of modified tile is null", true);
                            return false;
                        }
                        const modifiedNodeTest = this.nodeMap.inverse.get(modifiedTile);
                        if (modifiedNodeTest == undefined) {
                            printDebug("No node found for modified tile", true);
                            return false;
                        }
                        modifiedNode = modifiedNodeTest;
                        break findloop;
                    }
                }
                for (const child of tile.tiles) {
                    stackNext.push(child);
                }
            }
            stack = stackNext;
            stackNext = [];
        }
        if (modifiedNode == null) {
            return true;
        }
        let modifiedTile = this.nodeMap.get(modifiedNode)!;
        // check if horizontal or vertical size is modified in children
        // case where height is modified, meaning the tiles are stacked vertically
        const oldRatio = modifiedNode.childRatio;
        if (modifiedTile.tiles[0].relativeGeometry.height != modifiedTile.tiles[0].oldRelativeGeometry!.height) {
            modifiedNode.childRatio = modifiedTile.tiles[0].relativeGeometry.height / modifiedTile.relativeGeometry.height;
        } else {
            modifiedNode.childRatio = modifiedTile.tiles[0].relativeGeometry.width / modifiedTile.relativeGeometry.width;
        }
        // some bugs leaking through, this solution should stop them. this is the duct tape of programming
        if (modifiedNode.childRatio > 0.95) {
            modifiedNode.childRatio = oldRatio;
        }
        // set these so they dont interfere with other child ratios changing
        modifiedTile.tiles[0].oldRelativeGeometry = copy(modifiedTile.tiles[0].relativeGeometry);
        modifiedTile.tiles[1].oldRelativeGeometry = copy(modifiedTile.tiles[1].relativeGeometry);
        return true;
    }
    
    placeClients(): Array<[KWin.AbstractClient, KWin.Tile]> {
        let ret = new Array<[KWin.AbstractClient, KWin.Tile]>;
        // i love copy and paste this is why i develop software
        let stack: Array<TreeNode> = [this.rootNode];
        let stackNext: Array<TreeNode> = [];
        while (stack.length > 0) {
            for (const node of stack) {
                if (node.client != null) {
                    let tile = this.nodeMap.get(node);
                    if (tile == undefined) {
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
    
    addClient(client: KWin.AbstractClient): boolean {
        // truly this is the peak of programming
        let stack: Array<TreeNode> = [this.rootNode];
        let stackNext: Array<TreeNode> = [];
        let i = 0;
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
            // invert insertion order every 2 iterations if option is enabled to put windows on right
            if (config.invertInsertion && i % 2 == 0) {
                stack.reverse();
            }
            stackNext = [];
            i += 1;
        }
        return true;
    }

    putClientInTile(client: KWin.AbstractClient, tile: KWin.Tile): boolean {
        // assumes the nodemap has been built correctly
        const node = this.nodeMap.inverse.get(tile);
        if (node == undefined) {
            printDebug("No node found for tile", true);
            return false;
        }
        if (node.client == null) {
            node.client = client;
        } else {
            node.split();
            node.children![0].client = node.client;
            node.children![1].client = client;
            node.client = null;
        }
        return true;
    }
    
    clientOfTile(tile: KWin.Tile): KWin.AbstractClient | null {
        const node = this.nodeMap.inverse.get(tile);
        if (node == undefined) {
            printDebug("No node found for tile", true);
            return null;
        }
        return node.client;
    }
    
    swapTiles(tileA: KWin.Tile, tileB: KWin.Tile): boolean {
        const nodeA = this.nodeMap.inverse.get(tileA);
        const nodeB = this.nodeMap.inverse.get(tileB);
        if (nodeA == undefined || nodeB == undefined) {
            printDebug("No node found for tile", true);
            return false;
        }
        if (nodeA.client == null || nodeB.client == null) {
            printDebug("No client in one of the nodes", true);
            return false;
        }
        let tmpClient: KWin.AbstractClient = nodeA.client;
        nodeA.client = nodeB.client;
        nodeB.client = tmpClient;
        return true;
    }
    
    // cant copy code because indexed by string not object
    removeClient(client: KWin.AbstractClient): boolean {
        let stack: Array<TreeNode> = [this.rootNode];
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
        return true;
    }
}
