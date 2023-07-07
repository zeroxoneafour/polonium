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
    }
    
    interface Settings {
        engine: number;
        insertionPoint: number;
    }
    
    interface Desktop {
        screen: number;
        activity: string;
        desktop: number;
    }
}
