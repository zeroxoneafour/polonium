// main.qml - Entry point into script

import "./main.mjs" as Polonium;
import QtQuick 2.15;
import org.kde.kwin 2.0;

Item
{
    id: root;

    function printQml(string)
    {
        print(string);
    }

    function createTimer()
    {
        return Qt.createQmlObject("import QtQuick 2.15; Timer {}", rootScript);
    }
    
    function createDBusCall() {
        return Qt.createQmlObject("import QtQuick 2.15; import org.kde.kwin 2.0; DBusCall {}", rootScript);
    }
    
    Component.onCompleted:
    {
        const api =
        {
            "workspace": workspace,
            "options": options,
            "kwin": KWin,
        };
        const qmlObjects =
        {
            "root": root,
        };
        Polonium.main(api, qmlObjects);
    }
}
