import QtQuick;
import QtQuick.Layouts;
import QtQuick.Controls as QC;
import org.kde.kwin;
import org.kde.plasma.components as PC3;
import org.kde.plasma.core as PlasmaCore;

PlasmaCore.Dialog {
    id: root;
    
    property var desktop: ({});
    property var activity: ({});
    property var output: ({});

    property int engineType: 0;
    property var engineSettings: ({
        rotateLayout: false,
        swapInsertSide: false,
        middleSplit: 0.5,
        depthFirst: false,
    });
    
    property rect screenGeometry;
    x: (screenGeometry.x + screenGeometry.width / 2) - width / 2;
    y: (screenGeometry.y + screenGeometry.height / 2) - height / 2;

    type: PlasmaCore.Dialog.OnScreenDisplay;
    flags: Qt.Popup | Qt.WindowStaysOnTopHint;
    location: PlasmaCore.Types.Floating;
    hideOnWindowDeactivate: true;
    
    function show(desktop, activity, output, engineType, engineSettings) {
        this.desktop = desktop;
        this.activity = activity;
        this.output = output;

        this.engineType = engineType;
        this.engineSettings = engineSettings;
                
        // Update current screen information
        this.screenGeometry = Workspace.clientArea(KWin.MaximizeArea, output, desktop);
        
        // Show the popup
        this.visible = true;
    }
    
    function hide() {
        this.visible = false;
    }

    function saveEngineTypeFn() {
        this.saveSettings(
            this.desktop,
            this.activity,
            this.output,
            this.engineType,
            undefined,
        );
    }
    function saveSettingsFn() {
        this.saveSettings(
            this.desktop,
            this.activity,
            this.output,
            this.engineType,
            this.engineSettings,
        );
    }
    
    signal saveSettings(desktop: var, activity: var, output: var, engineType: int, engineSettings: var);
    signal resetSettings(desktop: var, activity: var, output: var);
                
    mainItem: ColumnLayout {
        id: rootLayout;
        Layout.alignment: Qt.AlignHCenter;
        spacing: 10;

        GridLayout {
            columns: 2;

            PC3.Label {
                text: "Engine:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.ComboBox {
                model: ["Binary Tree", "Half"];
                currentIndex: root.engineType;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineType = idx;
                    root.saveEngineTypeFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("rotateLayout");
                text: "Rotate Layout:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.CheckBox {
                visible: root.engineSettings.hasOwnProperty("rotateLayout");
                checked: root.engineSettings.rotateLayout ?? false;
                onClicked: {
                    root.engineSettings.rotateLayout = !root.engineSettings.rotateLayout;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("swapInsertSide");
                text: "Swap Insert Side:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.CheckBox {
                visible: root.engineSettings.hasOwnProperty("swapInsertSide");
                checked: root.engineSettings.swapInsertSide ?? false;
                onClicked: {
                    root.engineSettings.swapInsertSide = !root.engineSettings.swapInsertSide;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("middleSplit");
                text: "Middle Split:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            // why does PC3 not have a double spin box???
            PC3.SpinBox {
                visible: root.engineSettings.hasOwnProperty("middleSplit");
                from: 15;
                to: 85;
                value: root.engineSettings.middleSplit * 100 ?? 50;
                onValueModified: {
                    root.engineSettings.middleSplit = this.value / 100;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("depthFirst");
                text: "Depth First Insertion:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.CheckBox {
                visible: root.engineSettings.hasOwnProperty("depthFirst");
                checked: root.engineSettings.depthFirst ?? false;
                onClicked: {
                    root.engineSettings.depthFirst = !root.engineSettings.depthFirst;
                    root.saveSettingsFn();
                }
            }
        }

        PC3.Button {
            Layout.fillWidth: true;
            text: "Reset to Default Settings";
            onClicked: {
                root.resetSettings(
                    root.desktop,
                    root.activity,
                    root.output,
                );
            }
        }
  
        PC3.Button {
            Layout.fillWidth: true;
            text: "Close Menu";
            onClicked: {
                root.hide();
            }
        }
    }
}