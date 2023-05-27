namespace BTree {

type Desktop = Engine.Desktop;

class TreeNode {
    parent: TreeNode | null = null;
    sibling: TreeNode | null = null;
    children: [TreeNode, TreeNode] | null = null;
    window: KWin.AbstractClient | null = null;
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
            this.parent.window = this.sibling.window;
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
}

export class TilingEngine implements Engine.TilingEngine {
    rootNodes: Map<Desktop, RootNode> = new Map;
    // changed when desktop is changed
    nodeMap: BiMap<TreeNode, KWin.Tile> = new BiMap;
    
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): void {
        // set up
        this.nodeMap = new BiMap;
        if (!this.rootNodes.has(desktop)) {
            this.rootNodes.set(desktop, new RootNode);
        }
        const rootNode = this.rootNodes.get(desktop)!;
        // modify rootTile
        let stack: Array<TreeNode> = [rootNode];
        let stackNext: Array<TreeNode> = [];
        this.nodeMap.push(rootNode, rootTile);
        let i = 0;
        while (stack.length > 0) {
            i += 1;
            for (const node of stack) {
                if (node.children != null) {
                    const tile = this.nodeMap.key(node);
                    if (tile == null) {
                        printDebug("No tile found for node", true);
                        continue;
                    }
                    tile.split(i % 2);
                    let j = 0;
                    for (const child of node.children) {
                        this.nodeMap.push(child, tile.tiles[j]);
                        stackNext.push(child);
                        j += 1;
                    }
                }
            }
            stack = stackNext;
            stackNext = [];
        }
    }
    updateTile(_tile: KWin.Tile): void {
        // will implement this later lol
    }
    placeClients(desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile]> {
        let ret = new Array<[KWin.AbstractClient, KWin.Tile]>;
        const rootNode = this.rootNodes.get(desktop);
        if (rootNode == null) {
            printDebug("Root node null for desktop " + desktop, true);
            return ret;
        }
        // i love copy and paste this is why i develop software
        let stack: Array<TreeNode> = [rootNode];
        let stackNext: Array<TreeNode> = [];
        while (stack.length > 0) {
            for (const node of stack) {
                if (node.window != null) {
                    let tile = this.nodeMap.key(node);
                    if (tile == null) {
                        printDebug("No tile found for node", true);
                        continue;
                    }
                    ret.push([node.window, tile]);
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
    registerClient(client: KWin.AbstractClient): void {
        for (const activity of client.activities) {
            let desktop = new Engine.Desktop;
            desktop.screen = client.screen;
            desktop.activity = activity;
            desktop.desktop = client.desktop;
            if (this.rootNodes.get(desktop) == null) {
                this.rootNodes.set(desktop, new RootNode);
            }
            let rootNode = this.rootNodes.get(desktop)!;
            // truly this is the peak of programming
            let stack: Array<TreeNode> = [rootNode];
            let stackNext: Array<TreeNode> = [];
            while (stack.length > 0) {
                for (const node of stack) {
                    if (node.children == null) {
                        if (node.window != null) { // case for basically all non-root tiles
                            node.split();
                            node.children![0].window = node.window;
                            node.children![1].window = client;
                        } else { // just add the client
                            node.window = client;
                        }
                        return;
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
        this.registerClient(client);
    }
    updateClientPosition(_client: KWin.AbstractClient): void {
        // also will do later
    }
    // its slow but what can you do
    removeClient(client: KWin.AbstractClient): void {
        for (const rootNode of this.rootNodes.values()) {
            let stack: Array<TreeNode> = [rootNode];
            let stackNext: Array<TreeNode> = [];
            let deleteQueue: Array<TreeNode> = [];
            while (stack.length > 0) {
                for (const node of stack) {
                    if (node.window == client) {
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

} // namespace
