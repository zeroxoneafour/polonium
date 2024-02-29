import QtQuick;
import QtQuick.Layouts;
import org.kde.kwin;
import org.kde.plasma.components 3.0 as PC3;
import org.kde.plasma.core 2.0 as PlasmaCore;

PlasmaCore.Dialog {
    id: settingsDialog;
    
    property var settings: ({
        // see engine enum
        engineType: 0,
        // 0 - left side, 1 - right side, 2 - active
        insertionPoint: 1,
        rotateLayout: false,
    })
    
    property var desktop: ({
        output: "",
        activity: "",
        desktop: "",
    })
    
    property rect screenGeometry;
    x: (screenGeometry.x + screenGeometry.width / 2) - width / 2;
    y: (screenGeometry.y + screenGeometry.height / 2) - height / 2;

    type: PlasmaCore.Dialog.OnScreenDisplay;
    flags: Qt.Popup | Qt.WindowStaysOnTopHint;
    location: PlasmaCore.Types.Floating;
    hideOnWindowDeactivate: true;

    function setSettings(s) {
        this.settings.engineType = s.engineType;
        this.settings.insertionPoint = s.insertionPoint;
        this.settings.rotateLayout = s.rotateLayout;
    }
    
    function show() {
        // update desktop
        this.desktop.output = Workspace.activeScreen.name;
        this.desktop.activity = Workspace.currentActivity;
        this.desktop.desktop = Workspace.currentDesktop.id;
        
        // update settings
        engine.currentIndex = this.settings.engineType;
        insertionPoint.currentIndex = this.settings.insertionPoint;
        rotation.checkState = this.settings.rotateLayout ? Qt.Checked : Qt.Unchecked;
        
        // Update current screen information
        this.screenGeometry = Workspace.clientArea(KWin.FullScreenArea, Workspace.activeScreen, Workspace.currentDesktop);
        
        // Show the popup
        this.visible = true;
    }
    
    function hide() {
        this.visible = false;
    }
    
    signal saveSettingsInternal(settings: var, desktop: var);
    signal removeSettingsInternal(desktop: var);
    
    function saveSettings() {
        this.settings.engineType = engine.currentIndex;
        this.settings.insertionPoint = insertionPoint.currentIndex;
        this.settings.rotateLayout = (rotateLayout.checkState == Qt.Checked);
        this.saveSettingsInternal(this.settings, this.desktop);
    }
    
    function removeSettings() {
        this.removeSettingsInternal(this.desktop);
    }
        
    mainItem: ColumnLayout {
        id: main;
        Layout.alignment: Qt.AlignHCenter;
        spacing: 10;
        
        RowLayout {
            Layout.fillWidth: true;
            Layout.alignment: Qt.AlignHCenter;
            spacing: 10;
            
            PC3.Label {
                text: "Engine:";
            }
            PC3.ComboBox {
                id: engine;
                model: ["Binary Tree", "Half", "Three Column", "KWin"];
            }
        }
        
        RowLayout {
            Layout.alignment: Qt.AlignHCenter;
            Layout.fillWidth: true;
            spacing: 10;
            
            PC3.Label {
                text: "Insertion Point:";
            }
            PC3.ComboBox {
                id: insertionPoint;
                model: ["Left", "Right", "Selected"];
            }
        }
        
        RowLayout {
            Layout.alignment: Qt.AlignHCenter;
            Layout.fillWidth: true;
            spacing:10;
            
            PC3.CheckBox {
                id: rotateLayout;
                text: "Rotate Layout"
            }
        }
        
        RowLayout {
            Layout.alignment: Qt.AlignHCenter;
            Layout.fillWidth: true;
            
            PC3.Button  {
                text: "Save and close";
                onClicked:  {
                    settingsDialog.saveSettings();
                    settingsDialog.hide();
                }
            }
            PC3.Button {
                text: "Close without saving";
                onClicked: {
                    settingsDialog.hide();
                }
            }
        }
        
        RowLayout {
            Layout.alignment: Qt.AlignHCenter;
            Layout.fillWidth: true;
            spacing: 10;
            
            PC3.Button {
                text: "Remove custom settings and close";
                onClicked: {
                    settingsDialog.removeSettings();
                    settingsDialog.hide();
                }
            }
        }
    }
}
