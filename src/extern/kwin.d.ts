// kwin.d.ts - Declarations around the KWin API

import * as Qt from "extern/qt";

// AbstractClient
export interface Client
{
    readonly minSize: Qt.QPoint;
}

export enum LayoutDirection
{
    Floating = 0,
    Horizontal,
    Vertical,
}

export interface Tile
{
    tiles: Tile[];
    windows: Client[];
    absoluteGeometry: Qt.QRect;
    relativeGeometry: Qt.QRect;
    layoutDirection: LayoutDirection;
    parent: Tile | null;
    padding: number;
    
    layoutModified: Qt.Signal<() => void>;
    
    split(direction: LayoutDirection): void;
    remove(): void;
}

export interface RootTile extends Tile
{
    parent: null;
}

export interface Workspace
{
    activeClient: Client | null;
    activeScreen: number;
    currentActivity: string;
    currentDesktop: number;
}

export interface Options
{
    configChanged: Qt.Signal<() => void>
}

export interface Api
{
    readConfig<T>(key: string, defaultValue?: T): T;
    registerShortcut(id: string, desc: string, keybind: string, callback: Function): void;
}
