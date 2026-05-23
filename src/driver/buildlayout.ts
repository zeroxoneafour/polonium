// driver/buildlayout.ts - A function so nice we have it twice
import { Tile as KwinTile, LayoutDirection } from "kwin-api";
import { Tile as EngineTile } from "../engine";
import { Queue } from "../util/queue";
import { console } from "../controller";

export function buildLayout(kwinRootTile: KwinTile, engineRootTile: EngineTile): Map<KwinTile, EngineTile> {
    const tileMap = new Map<KwinTile, EngineTile>();
    const queue = new Queue<[KwinTile, EngineTile]>();
    queue.push([kwinRootTile, engineRootTile]);
    while (!queue.isEmpty) {
        const [kwinTile, engineTile] = queue.pop()!;
        tileMap.set(kwinTile, engineTile);

        const layoutDirection = engineTile.layoutDirection;
        kwinTile.layoutDirection = layoutDirection;

        //console.log("children diff -", childrenDiff);

        // if engine tile has one child then tie that child to the kwin tile
        if (engineTile.children.length == 1) {
            while (kwinTile.tiles.length > 0) {
                kwinTile.tiles[kwinTile.tiles.length - 1].remove();
            }
            queue.push([kwinTile, engineTile.children[0]]);
        } else {
            matchChildrenCount(kwinTile, engineTile);
        }

        if (engineTile.children.length > 1) {
            matchChildrenSizes(kwinTile, engineTile);
            for (let i = 0; i < engineTile.children.length; i += 1) {
                queue.push([kwinTile.tiles[i], engineTile.children[i]]);
            }
        }
    }
    return tileMap;
}

function matchChildrenCount(kwinTile: KwinTile, engineTile: EngineTile): void {
    const layoutDirection = engineTile.layoutDirection;
    // only one of these whiles should run
    while (kwinTile.tiles.length > engineTile.children.length) {
        // if there is only one child left then it will take over for its parent so just dont worry about it
        kwinTile.tiles[kwinTile.tiles.length - 1].remove();
    }
    while (kwinTile.tiles.length < engineTile.children.length) {
        if (kwinTile.tiles.length == 0) {
            kwinTile.split(layoutDirection);
        } else {
            // splitting in layout direction leads to creating children
            kwinTile.tiles[kwinTile.tiles.length - 1].split(layoutDirection);
        }
    }
}

function matchChildrenSizes(kwinTile: KwinTile, engineTile: EngineTile): void {
    const layoutDirection = engineTile.layoutDirection;
    const totalSize = engineTile.children.reduce((a, b) => a + b.size, 0);
    for (let i = 0; i < kwinTile.tiles.length; i += 1) {
        const kwinChild = kwinTile.tiles[i];
        const engineChild = engineTile.children[i];
        if (layoutDirection == LayoutDirection.Horizontal) {
            kwinChild.relativeGeometry.width = kwinTile.relativeGeometry.width * (engineChild.size / totalSize);
        } else if (layoutDirection == LayoutDirection.Vertical) {
            kwinChild.relativeGeometry.height = kwinTile.relativeGeometry.height * (engineChild.size / totalSize);
        }
    }
}