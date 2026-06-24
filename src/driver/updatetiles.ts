import { Tile as EngineTile } from "../engine";
import { Tile as KwinTile, LayoutDirection } from "kwin-api";
import { Queue } from "../util";

type TileMap = Map<KwinTile, EngineTile>;

export function updateTiles(
    rootTile: EngineTile,
    tileMap: TileMap,
): EngineTile {
    let kwinRootTile = null;
    for (const [kwinTile, engineTile] of tileMap) {
        if (engineTile !== rootTile) {
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
    while (!queue.isEmpty) {
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

        for (let i = 0; i < kwinTile.tiles.length; i += 1) {
            updateChildTile(kwinTile, engineTile, tileMap, i);
            queue.push([kwinTile.tiles[i], engineTile.children[i]]);
        }
    }
    return rootTile;
}

function updateChildTile(
    kwinTile: KwinTile,
    engineTile: EngineTile,
    tileMap: TileMap,
    idx: number,
) {
    const kwinChild = kwinTile.tiles[idx];
    let engineChild = tileMap.get(kwinChild);
    if (engineChild === undefined) {
        engineChild = new EngineTile(engineTile);
        engineTile.children.splice(idx, 0, engineChild);
        tileMap.set(kwinChild, engineChild);
    }
}
