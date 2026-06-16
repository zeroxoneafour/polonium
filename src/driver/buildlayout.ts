// driver/buildlayout.ts - A function so nice we have it twice
import { Tile as KwinTile, LayoutDirection } from "kwin-api";
import { Tile as EngineTile } from "../engine";
import { Queue } from "../util/queue";
import { config, console } from "../controller";

export function buildLayout(
    kwinRootTile: KwinTile,
    engineRootTile: EngineTile,
): Map<KwinTile, EngineTile> {
    if (config().fullRebuild) {
        while (kwinRootTile.tiles.length > 0) {
            kwinRootTile.tiles[kwinRootTile.tiles.length - 1].remove();
        }
    }

    const tileMap = new Map<KwinTile, EngineTile>();
    const queue = new Queue<[KwinTile, EngineTile]>();
    queue.push([kwinRootTile, engineRootTile]);

    while (!queue.isEmpty) {
        const [kwinTile, engineTile] = queue.pop()!;
        if (kwinTile == null) {
            console().warn("kwin tile is null");
            continue;
        }
        tileMap.set(kwinTile, engineTile);
        console().debug("forming tile", kwinTile.absoluteGeometry);

        // changing layout direction with preexisting children causes tiling to freak
        // so we js remove the children beforehand
        if (kwinTile.layoutDirection !== engineTile.layoutDirection) {
            while (kwinTile.tiles.length > 0) {
                kwinTile.tiles[kwinTile.tiles.length - 1].remove();
            }
            kwinTile.layoutDirection = engineTile.layoutDirection;
        }

        console().debug("kwin children", kwinTile.tiles.length);
        console().debug("engine children", engineTile.children.length);

        // if engine tile has one child then tie that child to the kwin tile
        if (engineTile.children.length == 1) {
            while (kwinTile.tiles.length > 0) {
                kwinTile.tiles[kwinTile.tiles.length - 1].remove();
            }
            queue.push([kwinTile, engineTile.children[0]]);
        } else {
            matchChildren(kwinTile, engineTile);
        }

        if (engineTile.children.length > 1) {
            for (let i = 0; i < engineTile.children.length; i += 1) {
                queue.push([kwinTile.tiles[i], engineTile.children[i]]);
            }
        }
    }
    return tileMap;
}

// matches children count and sizing using following steps -
// 1 - removes old children
// 2 - properly sizes all but last of current children (only done if older children remain)
// 3 - adds new children, sizing the second to last child after each add
// 4 - sizes last tile
// config().fullRebuild controls whether all children or only extras are removed
function matchChildren(kwinTile: KwinTile, engineTile: EngineTile): void {
    const layoutDirection = engineTile.layoutDirection;
    // step 1
    // this will be empty if full rebuild
    while (kwinTile.tiles.length > engineTile.children.length) {
        // if there is only one child left then it will take over for its parent
        kwinTile.tiles[kwinTile.tiles.length - 1].remove();
    }
    if (engineTile.children.length === 0) return;
    // step 2
    for (let i = 0; i < kwinTile.tiles.length - 1; i += 1) {
        setChildRelativeSize(kwinTile, engineTile, i);
    }
    // step 3
    while (kwinTile.tiles.length < engineTile.children.length) {
        if (kwinTile.tiles.length == 0) {
            kwinTile.split(layoutDirection);
            setChildRelativeSize(kwinTile, engineTile, 0);
        } else {
            kwinTile.tiles[kwinTile.tiles.length - 1].split(layoutDirection);
            setChildRelativeSize(
                kwinTile,
                engineTile,
                kwinTile.tiles.length - 2,
            );
        }
    }
    // step 4
    setChildRelativeSize(kwinTile, engineTile, kwinTile.tiles.length - 1);
}

function setChildRelativeSize(
    kwinTile: KwinTile,
    engineTile: EngineTile,
    index: number,
): void {
    const totalSize = engineTile.totalChildrenSize();
    const kwinChild = kwinTile.tiles[index];
    const engineChild = engineTile.children[index];
    if (engineTile.layoutDirection === LayoutDirection.Horizontal) {
        kwinChild.relativeGeometry.width =
            kwinTile.relativeGeometry.width * (engineChild.size / totalSize);
    } else if (engineTile.layoutDirection === LayoutDirection.Vertical) {
        kwinChild.relativeGeometry.height =
            kwinTile.relativeGeometry.height * (engineChild.size / totalSize);
    }
}
