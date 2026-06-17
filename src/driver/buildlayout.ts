// driver/buildlayout.ts - A function so nice we have it twice
import { Edge, Tile as KwinTile, LayoutDirection } from "kwin-api";
import { Tile as EngineTile } from "../engine";
import { Queue } from "../util";
import { config, console, qt } from "../controller";
import { QRect } from "kwin-api/qt";

export function buildLayout(
    kwinRootTile: KwinTile,
    engineRootTile: EngineTile,
    screenSize: QRect,
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
            console().warn(
                "engine tile at",
                kwinTile.absoluteGeometry,
                "has only one child",
            );
            while (kwinTile.tiles.length > 0) {
                kwinTile.tiles[kwinTile.tiles.length - 1].remove();
            }
            queue.push([kwinTile, engineTile.children[0]]);
        } else {
            matchChildren(kwinTile, engineTile, screenSize);
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
function matchChildren(
    kwinTile: KwinTile,
    engineTile: EngineTile,
    screenSize: QRect,
): void {
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
        setChildRelativeSize(kwinTile, engineTile, i, screenSize);
    }
    // step 3
    while (kwinTile.tiles.length < engineTile.children.length) {
        if (kwinTile.tiles.length == 0) {
            kwinTile.split(layoutDirection);
            setChildRelativeSize(kwinTile, engineTile, 0, screenSize);
        } else {
            kwinTile.tiles[kwinTile.tiles.length - 1].split(layoutDirection);
            setChildRelativeSize(
                kwinTile,
                engineTile,
                kwinTile.tiles.length - 2,
                screenSize,
            );
        }
    }
    // step 4
    setChildRelativeSize(
        kwinTile,
        engineTile,
        kwinTile.tiles.length - 1,
        screenSize,
    );
}

function setChildRelativeSize(
    kwinTile: KwinTile,
    engineTile: EngineTile,
    index: number,
    screenSize: QRect,
): void {
    const totalSize = engineTile.totalChildrenSize();
    const kwinChild = kwinTile.tiles[index];
    const engineChild = engineTile.children[index];
    console().debug("target size -", engineChild.size);
    const oldGeom = kwinChild.relativeGeometry;
    console().debug("previous dimensions -", oldGeom);
    // use parent dimensions here, fix it below
    const geom = qt().rect(
        kwinTile.relativeGeometry.x,
        kwinTile.relativeGeometry.y,
        kwinTile.relativeGeometry.width,
        kwinTile.relativeGeometry.height,
    );
    if (engineTile.layoutDirection === LayoutDirection.Horizontal) {
        geom.width *= engineChild.size / totalSize;
        let previousChildrenSize = 0;
        for (let i = 0; i < index; i += 1) {
            previousChildrenSize += engineTile.children[i].size;
        }
        previousChildrenSize /= totalSize;
        previousChildrenSize *= kwinTile.relativeGeometry.width;
        geom.x += previousChildrenSize;
    } else if (engineTile.layoutDirection === LayoutDirection.Vertical) {
        geom.height *= engineChild.size / totalSize;
        let previousChildrenSize = 0;
        for (let i = 0; i < index; i += 1) {
            previousChildrenSize += engineTile.children[i].size;
        }
        previousChildrenSize /= totalSize;
        previousChildrenSize *= kwinTile.relativeGeometry.height;
        geom.y += previousChildrenSize;
    }
    console().debug("target dimensions -", geom);
    // we cant even just set it so we use resizeByPixels in combination with the screen size
    // x
    const resizeX = Math.floor((geom.x - oldGeom.x) * screenSize.width);
    if (resizeX != 0) {
        kwinChild.resizeByPixels(resizeX, Edge.LeftEdge);
    }
    // y
    const resizeY = Math.floor((geom.x - oldGeom.x) * screenSize.width);
    if (resizeY != 0) {
        kwinChild.resizeByPixels(resizeY, Edge.TopEdge);
    }
    // width (far x)
    const resizeW = Math.floor(
        (geom.x + geom.width - oldGeom.x - oldGeom.width) * screenSize.width,
    );
    if (resizeW != 0) {
        kwinChild.resizeByPixels(resizeW, Edge.RightEdge);
    }
    // height (far y)
    const resizeH = Math.floor(
        (geom.y + geom.height - oldGeom.y - oldGeom.height) * screenSize.height,
    );
    if (resizeH != 0) {
        kwinChild.resizeByPixels(resizeH, Edge.BottomEdge);
    }
    console().debug("final dimensions -", kwinChild.relativeGeometry);
}
