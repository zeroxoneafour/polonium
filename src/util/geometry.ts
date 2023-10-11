// geometry.ts - Useful geometry functions

import { QPoint, QRect, QSize } from "../extern/qt";

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
    
    static fromRect(r: QRect)
    {
        return new GSize(
            {
                "width": r.width,
                "height": r.height,
            }
        )
    }
}
