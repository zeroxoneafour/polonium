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
    property var engineSettings: ({});
    
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
                model: ["Binary Tree", "Half", "Three Column", "Pillars", "Pager"];
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
                visible: root.engineSettings.hasOwnProperty("side1Size");
                text: "Side 1 Size:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.SpinBox {
                visible: root.engineSettings.hasOwnProperty("side1Size");
                from: 15;
                to: (0.85 - root.engineSettings.side2Size) * 100 ?? 70;
                value: root.engineSettings.side1Size * 100 ?? 25;
                onValueModified: {
                    root.engineSettings.side1Size = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("side2Size");
                text: "Side 2 Size:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.SpinBox {
                visible: root.engineSettings.hasOwnProperty("side2Size");
                from: 15;
                to: (0.85 - root.engineSettings.side1Size) * 100 ?? 70;
                value: root.engineSettings.side2Size * 100 ?? 25;
                onValueModified: {
                    root.engineSettings.side2Size = this.value / 100;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("pillarCount");
                text: "Pillars:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.SpinBox {
                visible: root.engineSettings.hasOwnProperty("pillarCount");
                from: 1;
                to: 10;
                value: root.engineSettings.pillarCount ?? 3;
                onValueModified: {
                    root.engineSettings.pillarCount = this.value;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("pageWidth");
                text: "Page Width:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.SpinBox {
                visible: root.engineSettings.hasOwnProperty("pageWidth");
                from: 15;
                to: 20;
                value: root.engineSettings.pageWidth * 100 ?? 15;
                onValueModified: {
                    root.engineSettings.pageWidth = this.value / 100;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("insertionStyle");
                text: "Insertion Style:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            // btree insertion style
            PC3.ComboBox {
                visible: root.engineSettings.hasOwnProperty("insertionStyle") && root.engineType === 0;
                model: ["Shallow", "Dwindle", "Spiral"];
                currentIndex: root.engineSettings.insertionStyle ?? 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineSettings.insertionStyle = idx;
                    root.saveSettingsFn();
                }
            }
            // pillars insertion style
            PC3.ComboBox {
                visible: root.engineSettings.hasOwnProperty("insertionStyle") && root.engineType === 3;
                model: ["Rows", "Snake", "Rows Up", "Snake Up"];
                currentIndex: root.engineSettings.insertionStyle ?? 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineSettings.insertionStyle = idx;
                    root.saveSettingsFn();
                }
            }

            PC3.Label {
                visible: root.engineSettings.hasOwnProperty("insertInActive");
                text: "Insert in Active Tile:";
                horizontalAlignment: Text.AlignRight;
                Layout.fillWidth: true;
            }
            PC3.CheckBox {
                visible: root.engineSettings.hasOwnProperty("insertInActive");
                checked: root.engineSettings.insertInActive ?? false;
                onClicked: {
                    root.engineSettings.insertInActive = !root.engineSettings.insertInActive;
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