declare interface CoreApi {
    workspace: KWin.WorkspaceWrapper;
    options: KWin.Options;
    kwin: KWin.Api;
    print(...values: any[]): void;
}

declare namespace Qml {
    interface Main {
        rootScript: object;
        dialog: Dialog
    }

    interface Dialog {
        show(text: string): void;
    }
}
