// main.qml - Entry point into script

import QtQuick;
import org.kde.kwin;

import "../code/main.mjs" as Polonium;

Item {
    id: root;

    function createTimer() {
        return Qt.createQmlObject("import QtQuick; Timer {}", root);
    }
    
    Component.onCompleted: {
        const api = {
            "workspace": Workspace,
            "options": Options,
            "kwin": KWin,
            "console": console,
            "qt": Qt,
        };
        const qmlObjects = {
            "root": root,
            "shortcuts": shortcutsLoader.item,
            "settings": settingsLoader.item,
            /*
            "dbus": dbusLoader.item,
            "osd": osdLoader.item,
            */
        };
        Polonium.main(api, qmlObjects);
    }

    Loader {
        id: shortcutsLoader;
                
        source: "shortcuts.qml";
    }

    Loader {
        id: settingsLoader;
                
        source: "settings.qml";
    }
    
    /*    
    Loader {
        id: dbusLoader;
        
        source: "dbus.qml";
    }
    
    Loader {
        id: osdLoader;
        
        source: "osd.qml";
    }
    */
}
