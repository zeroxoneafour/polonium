import "./main.mjs" as Polonium
import QtQuick 2.0
import org.kde.kwin 2.0

Item {
    id: rootScript
    
    Component.onCompleted: {
        const api = {
            "workspace": workspace,
            "options": options,
            "kwin": KWin,
            "print": print,
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
