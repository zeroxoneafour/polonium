import { Tile as EngineTile } from "../engine";
import { Tile as KwinTile, LayoutDirection } from "kwin-api";
import { Queue } from "../util";

type TileMap = Map<KwinTile, EngineTile>;

export function updateTiles(
    rootTile: EngineTile,
    tileMap: TileMap,
): EngineTile {
    // the root may be part of a single child chain (see below), any tile in it maps to the kwin root
    const rootChain = new Set<EngineTile>([rootTile]);
    for (let t = rootTile; t.children.length == 1; t = t.children[0]) {
        rootChain.add(t.children[0]);
    }
    let kwinRootTile = null;
    for (const [kwinTile, engineTile] of tileMap) {
        if (!rootChain.has(engineTile)) {
            continue;
        }
        kwinRootTile = kwinTile;
        break;
    }
    if (kwinRootTile == null) {
        return rootTile;
    }
    const queue: Queue<[KwinTile, EngineTile]> = new Queue();
    queue.push([kwinRootTile, rootTile]);
    while (queue.length > 0) {
        const [kwinTile, engineTile] = queue.pop()!;

        engineTile.layoutDirection = kwinTile.layoutDirection;
        let relativeSize = 1;
        if (kwinTile.parent != null) {
            const parent = kwinTile.parent;
            const direction = parent.layoutDirection;
            if (direction === LayoutDirection.Horizontal) {
                relativeSize =
                    kwinTile.relativeGeometry.width /
                    parent.relativeGeometry.width;
            } else if (direction === LayoutDirection.Vertical) {
                relativeSize =
                    kwinTile.relativeGeometry.height /
                    parent.relativeGeometry.height;
            } else {
                relativeSize /= parent.tiles.length;
            }
            relativeSize *= parent.tiles.length;
        }
        engineTile.size = relativeSize;

        // buildLayout ties single child engine tiles to the same kwin tile, so follow that
        // chain down to the engine tile whose children actually match the kwin children
        let innerTile = engineTile;
        while (innerTile.children.length == 1) {
            innerTile = innerTile.children[0];
        }
        innerTile.layoutDirection = kwinTile.layoutDirection;

        // pair children through the tile map rather than by index so that tiles
        // added or removed in kwin dont shift sizes onto the wrong engine tiles.
        // engine children whose kwin tile no longer exists are dropped
        const engineChildren: EngineTile[] = [];
        for (const kwinChild of kwinTile.tiles) {
            const engineChild = getEngineChild(kwinChild, innerTile, tileMap);
            engineChildren.push(engineChild);
            queue.push([kwinChild, engineChild]);
        }
        innerTile.children = engineChildren;
    }
    return rootTile;
}

function getEngineChild(
    kwinChild: KwinTile,
    engineTile: EngineTile,
    tileMap: TileMap,
): EngineTile {
    let engineChild = tileMap.get(kwinChild);
    if (engineChild === undefined) {
        engineChild = new EngineTile(engineTile);
        tileMap.set(kwinChild, engineChild);
        return engineChild;
    }
    // the map points at the innermost tile of a single child chain, walk back up to
    // the tile that is actually a child of engineTile
    while (
        engineChild.parent !== engineTile &&
        engineChild.parent !== null &&
        engineChild.parent.children.length == 1
    ) {
        engineChild = engineChild.parent;
    }
    engineChild.parent = engineTile;
    return engineChild;
}
