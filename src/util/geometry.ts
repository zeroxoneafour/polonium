// geometry.ts - Useful geometry functions (gtools)

import { QPoint, QRect } from "kwin-api/qt";

// direction uses up/right for quadrant of direction and vertical for whether the point is leaning vertically or horizontally along the y = +-x split
export const enum Direction {
    None = 0,
    Down = 1 << 0,
    Right = 1 << 1,
    Vertical = 1 << 2,
}

// translates direction from horizontal split tiles => vertical split tiles
// afaik this is one way and im not making it another way too bc its too hard
export function rotateDirection(d: Direction): Direction {
    let ret = Direction.None;
    if (!(d & Direction.Vertical)) ret |= Direction.Vertical;
    if (d & Direction.Right) ret |= Direction.Down;
    if (d & Direction.Down) ret |= Direction.Right;
    return ret;
}

export function directionFromPoint(r: QRect, p: QPoint): Direction {
    const x = p.x - r.x;
    const y = p.y - r.y;
    // vertical split
    if (x < r.width / 2) {
        // left
        // horizontal split
        if (y < r.height / 2) {
            // left top
            // position in diagonal cutting rect in half
            // math here came to me in a trance from an age long past
            if (x > (r.width * y) / r.height) {
                return Direction.Vertical; // left top, top leaning
            } else {
                return Direction.None; // left top, left leaning
            }
        } // left bottom
        else {
            if (x > (r.width * y) / r.height) {
                return Direction.Down | Direction.Vertical; // left bottom, bottom leaning
            } else {
                return Direction.Down; // left bottom, left leaning
            }
        }
    } // right
    else {
        if (y < r.height / 2) {
            // right top
            if (x < (r.width * y) / r.height) {
                return Direction.Right | Direction.Vertical; // right top, top leaning
            } else {
                return Direction.Right; // right top, right leaning
            }
        } // right bottom
        else {
            if (x < (r.width * y) / r.height) {
                return Direction.Down | Direction.Right | Direction.Vertical; // right bottom, bottom leaning
            } else {
                return Direction.Down | Direction.Right; // right bottom, right leaning
            }
        }
    }
}
