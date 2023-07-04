declare interface CoreApi {
    workspace: KWin.WorkspaceWrapper;
    options: KWin.Options;
    kwin: KWin.Api;
}

declare namespace Qml {
    interface Main {
        rootScript: RootScript;
        dialog: Dialog
    }
    
    interface RootScript {
        createTimer(): Qt.QTimer;
        printQml(text: string): void;
    }

    interface Dialog {
        show(text: string): void;
    }
}
