// shortcuts.qml - Shortcuts

import QtQuick;
import org.kde.kwin;

Item {
    id: dbus;
    
    function getRetileWindow() {
        return retileWindow;
    }
    
    function getOpenSettings() {
        return openSettings;
    }
    
    ShortcutHandler {
        id: retileWindow;
        
        name: "PoloniumRetileWindow";
        text: "Polonium: Retile Window";
        sequence: "Meta+Shift+Space";
    }
    
    ShortcutHandler {
        id: openSettings;
        
        name: "PoloniumOpenSettings";
        text: "Polonium: Open Settings Dialog";
        sequence: "Meta+\\";
    }
}
