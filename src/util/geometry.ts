// geometry.ts - Useful geometry functions

import { QPoint, QRect, QSize } from "../extern/qt";

// direction uses up/right for quadrant of direction and vertical for whether the point is leaning vertically or horizontally along the y = +-x split
export const enum Direction
{
    None = 0,
    Up = 1 << 0,
    Right = 1 << 1,
    Vertical = 1 << 2,
}

export class GPoint implements QPoint
{
    x: number = 0;
    y: number = 0;
    
    constructor(p?: QPoint)
    {
        if (p == undefined)
        {
            return;
        }
        this.x = p.x;
        this.y = p.y;
    }
    
    static centerOfRect(r: QRect): GPoint
    {
        return new GPoint(
        {
            x: r.x + (r.width / 2),
            y: r.y + (r.height / 2),
        });
    }
}

export class GRect implements QRect
{
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    
    constructor(r?: QRect)
    {
        if (r == undefined)
        {
            return;
        }
        this.x = r.x;
        this.y = r.y;
        this.width = r.width;
        this.height = r.height;
    }
    
    directionFromPoint(p: QPoint): Direction
    {
        // very complex, copied this in from old polonium
        const relativePoint = new GPoint(
            {
                x: p.x - this.x,
                y: p.y - this.y,
            }
        );
        // vertical split
        if (relativePoint.x < (this.width / 2)) // left
        {
            // horizontal split
            if (relativePoint.y < (this.height / 2)) // left top
            {
                // position in diagonal cutting rect in half
                // math here came to me in a trance from an age long past
                if (relativePoint.x > (this.width * relativePoint.y / this.height))
                {
                    return Direction.Up | Direction.Vertical; // left top, top leaning
                }
                else
                {
                    return Direction.Up; // left top, left leaning
                }
            }
            else // left bottom
            {
                if (relativePoint.x > (this.width * relativePoint.y / this.height))
                {
                    return Direction.Vertical; // left bottom, bottom leaning
                }
                else
                {
                    return Direction.None; // left bottom, left leaning
                }
            }
        }
        else // right
        {
            if (relativePoint.y < (this.height / 2)) // right top
            {
                if (relativePoint.x < (this.width * relativePoint.y / this.height))
                {
                    return Direction.Right | Direction.Up | Direction.Vertical; // right top, top leaning
                }
                else
                {
                    return Direction.Right | Direction.Up; // right top, right leaning
                }
            }
            else // right bottom
            {
                if (relativePoint.x < (this.width * relativePoint.y / this.height))
                {
                    return Direction.Right | Direction.Vertical; // right bottom, bottom leaning
                }
                else
                {
                    return Direction.Right; // right bottom, right leaning
                }
            }
        }
    }
}

export class GSize implements QSize
{
    width: number = 0;
    height: number = 0;
    
    constructor(s?: QSize)
    {
        if (s == undefined)
        {
            return;
        }
        this.width = s.width;
        this.height = s.height;
    }
    
    static fromRect(r: QRect): GSize
    {
        return new GSize(
            {
                "width": r.width,
                "height": r.height,
            }
        )
    }
    
    // compare two sizes and grow the caller if it is too small
    fitSize(s: QSize)
    {
        if (this.height < s.height)
        {
            this.height = s.height;
        }
        if (this.width < s.width)
        {
            this.width = s.width;
        }
    }
    
    write(s: QSize)
    {
        if (s.width != this.width)
        {
            s.width = this.width;
        }
        if (s.height != this.height)
        {
            s.height = this.height;            
        }
    }

    get area(): number
    {
        return this.width * this.height;
    }
}
