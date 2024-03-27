// main.qml - Entry point into script

import "../code/main.mjs" as Polonium;
import QtQuick;
import org.kde.kwin;

Item {
    id: root;

    function printQml(string) {
        print(string);
    }

    function createTimer() {
        return Qt.createQmlObject("import QtQuick; Timer {}", root);
    }
    
    Component.onCompleted: {
        const api = {
            "workspace": Workspace,
            "options": Options,
            "kwin": KWin,
        };
        const qmlObjects = {
            "root": root,
            "settings": settings,
            "shortcuts": shortcutsLoader.item,
            "dbus": dbusLoader.item,
            "osd": osdLoader.item,
        };
        Polonium.main(api, qmlObjects);
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
        
    Loader {
        id: dbusLoader;
        
        source: "dbus.qml";
    }
    
    Loader {
        id: shortcutsLoader;
                
        source: "shortcuts.qml";
    }
    
    Loader {
        id: osdLoader;
        
        source: "osd.qml";
    }
}
