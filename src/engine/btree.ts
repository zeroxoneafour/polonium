namespace BTree {

type Desktop = Engine.Desktop;

class TreeNode {
    parent: TreeNode | null = null;
    sibling: TreeNode | null = null;
    children: [TreeNode, TreeNode] | null = null;
    windows: Array<KWin.AbstractClient> = new Array;
    // the offset of the split between the children in pixels, so tiles can have different shapes
    splitOffset: number = 0;
}

class RootNode extends TreeNode {
    parent: null = null;
    sibling: null = null;
}

export class TilingEngine implements Engine.TilingEngine {
    rootNodes: Map<Desktop, RootNode> = new Map;
    currentRootTile: KWin.Tile | null = null;
    buildLayout(rootTile: KWin.RootTile, desktop: Desktop): void {

    }
    placeClients(rootTile: KWin.RootTile, desktop: Desktop): Array<[KWin.AbstractClient, KWin.Tile]> {
        let ret = new Array<[KWin.AbstractClient, KWin.Tile]>
        return ret;
    }
    placeClient(client: KWin.AbstractClient, rootTile: KWin.RootTile, desktop: Desktop): KWin.Tile | null {
            let ret = null;
            return ret;
    }
    registerClient(client: KWin.AbstractClient): void {

    }
    updateClientDesktop(client: KWin.AbstractClient): void {

    }
    updateClientPosition(client: KWin.AbstractClient): void {

    }
    removeClient(client: KWin.AbstractClient): void {

    }
}

} // namespace
