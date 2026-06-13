import QtQuick;
import org.kde.kwin;

Item {
    id: root;

    function getSettings() {
        return getSettingsObj;
    }
    DBusCall {
        id: getSettingsObj;
        
        service: "xyz.vaughanm.polonium";
        path: "/saver";
        dbusInterface: "xyz.vaughanm.polonium";
        method: "GetSettings";
    }

    function setSettings() {
        return setSettingsObj;
    }
    DBusCall {
        id: setSettingsObj;
        
        service: "xyz.vaughanm.polonium";
        path: "/saver";
        dbusInterface: "xyz.vaughanm.polonium";
        method: "SetSettings";
    }

    function resetSettings() {
        return resetSettingsObj;
    }
    DBusCall {
        id: resetSettingsObj;
        
        service: "xyz.vaughanm.polonium";
        path: "/saver";
        dbusInterface: "xyz.vaughanm.polonium";
        method: "ResetSettings";
    }
}