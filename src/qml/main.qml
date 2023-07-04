import "./main.mjs" as Polonium
import QtQuick 2.0
import org.kde.kwin 2.0

Item {
    id: rootScript
    
    function createTimer() {
        return Qt.createQmlObject("import QtQuick 2.0; Timer {}", rootScript);
    }
    
    function printQml(string) {
        print(string);
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
        }
        Polonium.init(api, qmlObjects);
    }
    
    Loader {
        id: dialog

        function show(text) {
            dialog.item.show(text);
        }

        source: "dialog.qml"
    }

}
