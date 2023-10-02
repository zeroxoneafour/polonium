// qt.d.ts - Qt primitives

export interface Signal<T extends Function>
{
    connect(callback: T): void;
    disconnect(callback: T): void;
}

export interface QRect
{
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface QPoint
{
    x: number;
    y: number;
}

export interface QTimer
{
    interval: number;
    repeat: boolean;
    running: boolean;
    triggeredOnStart: boolean;
    
    triggered: Signal<() => void>;
    
    restart(): void;
    start(): void;
    stop(): void;
}

export interface DBusCall {
    service: string,
    path: string,
    dbusInterface: string,
    method: string,
    arguments: any[],
    finished: Signal<(returnValues: any[]) => void>;
    call(): void;
}
