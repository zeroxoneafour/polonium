import "./main.mjs" as Polonium
import QtQuick 2.15
import org.kde.kwin 2.0

Item {
    id: rootScript;
    
    function createTimer() {
        return Qt.createQmlObject("import QtQuick 2.15; Timer {}", rootScript);
    }
    
    function printQml(string) {
        print(string);
    }
    
    function createDBusCall() {
        return Qt.createQmlObject("import QtQuick 2.15; import org.kde.kwin 2.0; DBusCall {}", rootScript);
    }
    
    Component.onCompleted: {
        const api = {
            "workspace": workspace,
            "options": options,
            "kwin": KWin,
        };
        const qmlObjects = {
            "rootScript": rootScript,
            "dialog": dialog,
            "settings": settings,
        };
        Polonium.init(api, qmlObjects);
    }
    
    Loader {
        id: dialog;

        function show(text) {
            dialog.item.show(text);
        }

        source: "dialog.qml";
    }
    
    Loader {
        id: settings;
        
        function isVisible() {
            return settings.item.visible;
        }
        
        function setSettings(c) {
            settings.item.setSettings(c);
        }
        
        function show() {
            settings.item.show();
        }
        
        function hide() {
            settings.item.hide();
        }
        
        function saveAndHide() {
            settings.item.saveSettings();
            settings.item.hide();
        }
        
        signal saveSettings(a: var, b: var);
        signal removeSettings(a: var);
        
        source: "settings.qml";
    }
    
    Connections {
        target: settings.item;
        function onSaveSettingsInternal(a, b) {
            settings.saveSettings(a, b);
        }
        function onRemoveSettingsInternal(a) {
            settings.removeSettings(a);
        }
    }
}
