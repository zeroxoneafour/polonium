import QtQuick;
import org.kde.kwin;

Item {
    id: dbus;
    
    function getExists() {
        return exists;
    }
    
    function getGetSettings() {
        return getSettings;
    }
    
    function getSetSettings() {
        return setSettings;
    }
    
    function getRemoveSettings() {
        return removeSettings;
    }
    
    DBusCall {
        id: getSettings;
        
        service: "org.polonium.SettingSaver";
        path: "/saver";
        dbusInterface: "org.polonium.SettingSaver";
        method: "GetSettings";
    }

    DBusCall {
        id: setSettings;
        
        service: "org.polonium.SettingSaver";
        path: "/saver";
        dbusInterface: "org.polonium.SettingSaver";
        method: "GetSettings";
    }

    DBusCall {
        id: exists;
        
        service: "org.polonium.SettingSaver";
        path: "/saver";
        dbusInterface: "org.polonium.SettingSaver";
        method: "Exists";
    }
    
    DBusCall {
        id: removeSettings;
        
        service: "org.polonium.SettingSaver";
        path: "/saver";
        dbusInterface: "org.polonium.SettingSaver";
        method: "RemoveSettings";
    }
}
