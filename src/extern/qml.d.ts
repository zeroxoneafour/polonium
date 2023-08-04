declare interface CoreApi {
    workspace: KWin.WorkspaceWrapper;
    options: KWin.Options;
    kwin: KWin.Api;
}

declare namespace Qml {
    interface Main {
        rootScript: RootScript;
        dialog: Dialog;
        settings: SettingsDialog;
    }
    
    interface RootScript {
        createTimer(): Qt.QTimer;
        printQml(text: string): void;
        createDBusCall(): KWin.DBusCall;
    }

    interface Dialog {
        show(text: string): void;
    }
    
    interface SettingsDialog {
        isVisible(): boolean;
        show(): void;
        hide(): void;
        saveAndHide(): void;
        setSettings(s: Settings): void;
        saveSettings: Signal<(settings: Settings, desktop: Desktop) => void>;
        removeSettings: Signal<(desktop: Desktop) => void>;
    }
    
    interface Settings {
        engine: number;
        insertionPoint: number;
        rotation: boolean;
    }
    
    interface Desktop {
        screen: number;
        activity: string;
        desktop: number;
    }
}
