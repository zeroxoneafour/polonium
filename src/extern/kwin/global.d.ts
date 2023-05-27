// print function, afaik takes anything and prints it
declare function print(...values: any[]): void;
declare function readConfig(key: string, defaultValue?: any): any;
declare function registerShortcut(id: string, desc: string, keybind: string, callback: Function): void;

declare const workspace: KWin.WorkspaceWrapper;
declare const options: KWin.Options;

declare interface Signal<T> {
    connect(callback: T): void;
    disconnect(callback: T): void;
}
