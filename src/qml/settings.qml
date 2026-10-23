import QtQuick;
import QtQuick.Layouts;
import org.kde.kwin;
import org.kde.kirigami as Kirigami;
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

        // controls are assigned imperatively here because user interaction breaks
        // any declarative bindings, which would leave stale values on the next show.
        // assigning programmatically does not trigger onActivated/onValueModified/onClicked
        engineComboBox.currentIndex = engineType;

        ultrawideCheckBox.checked = engineSettings.ultrawideEnabled ?? false;
        ultrawideWidthSpinBox.value = (engineSettings.ultrawideWidth ?? 0.6) * 100;
        ultrawidePositionComboBox.currentIndex = engineSettings.ultrawidePosition ?? 0;

        rotateLayoutCheckBox.checked = engineSettings.rotateLayout ?? false;
        swapInsertSideCheckBox.checked = engineSettings.swapInsertSide ?? false;
        keepMasterCheckBox.checked = engineSettings.keepMaster ?? false;
        insertInActiveCheckBox.checked = engineSettings.insertInActive ?? false;

        middleSplitSpinBox.value = (engineSettings.middleSplit ?? 0.5) * 100;
        // side spin box limits depend on each other, so drop side 2 to its minimum
        // first so side 1 is not clamped by the previous side 2 value
        side2SizeSpinBox.value = side2SizeSpinBox.from;
        side1SizeSpinBox.value = (engineSettings.side1Size ?? 0.25) * 100;
        side2SizeSpinBox.value = (engineSettings.side2Size ?? 0.25) * 100;
        pillarCountSpinBox.value = engineSettings.pillarCount ?? 3;
        pageWidthSpinBox.value = (engineSettings.pageWidth ?? 0.15) * 100;
        btreeInsertionStyleComboBox.currentIndex = engineSettings.insertionStyle ?? 0;
        pillarsInsertionStyleComboBox.currentIndex = engineSettings.insertionStyle ?? 0;

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

    function hasProp(prop) {
        return this.engineSettings.hasOwnProperty(prop);
    }

    signal saveSettings(desktop: var, activity: var, output: var, engineType: int, engineSettings: var);
    signal resetSettings(desktop: var, activity: var, output: var);

    mainItem: ColumnLayout {
        // PlasmaCore.Dialog sizes itself from these, so pin them to the content size
        // so the dialog grows/shrinks as rows are shown or hidden
        Layout.minimumWidth: implicitWidth;
        Layout.maximumWidth: implicitWidth;
        Layout.minimumHeight: implicitHeight;
        Layout.maximumHeight: implicitHeight;
        spacing: Kirigami.Units.largeSpacing;

        Kirigami.Heading {
            Layout.margins: Kirigami.Units.largeSpacing;
            Layout.bottomMargin: 0;
            level: 2;
            text: "Tiling Settings";
        }

        // hidden items (and their FormData labels) are skipped by FormLayout
        Kirigami.FormLayout {
            Layout.margins: Kirigami.Units.largeSpacing;
            Layout.topMargin: 0;
            Layout.bottomMargin: 0;

            PC3.ComboBox {
                Kirigami.FormData.label: "Engine:";
                model: ["Binary Tree", "Half", "Three Column", "Pillars", "Pager", "KWin"];
                id: engineComboBox;
                currentIndex: 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineType = idx;
                    root.saveEngineTypeFn();
                }
            }

            Kirigami.Separator {
                Kirigami.FormData.isSection: true;
                Kirigami.FormData.label: "Single window";
                visible: root.hasProp("ultrawideEnabled");
            }
            PC3.CheckBox {
                id: ultrawideCheckBox;
                visible: root.hasProp("ultrawideEnabled");
                text: "Use custom sizing";
                checked: false;
                onClicked: {
                    root.engineSettings.ultrawideEnabled = this.checked;
                    root.saveSettingsFn();
                }
            }
            PC3.SpinBox {
                Kirigami.FormData.label: "Width (%):";
                visible: root.hasProp("ultrawideWidth");
                enabled: !root.hasProp("ultrawideEnabled") || ultrawideCheckBox.checked;
                from: 15;
                to: 85;
                id: ultrawideWidthSpinBox;
                value: 60;
                onValueModified: {
                    root.engineSettings.ultrawideWidth = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            PC3.ComboBox {
                Kirigami.FormData.label: "Position:";
                visible: root.hasProp("ultrawidePosition");
                enabled: !root.hasProp("ultrawideEnabled") || ultrawideCheckBox.checked;
                model: ["Center", "Left", "Right"];
                id: ultrawidePositionComboBox;
                currentIndex: 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineSettings.ultrawidePosition = idx;
                    root.saveSettingsFn();
                }
            }

            Kirigami.Separator {
                Kirigami.FormData.isSection: true;
                Kirigami.FormData.label: "Engine options";
                // only show the section if the engine has any options below
                visible: [
                    "rotateLayout",
                    "swapInsertSide",
                    "middleSplit",
                    "side1Size",
                    "side2Size",
                    "pillarCount",
                    "pageWidth",
                    "insertionStyle",
                    "keepMaster",
                    "insertInActive",
                ].some((prop) => root.hasProp(prop));
            }

            PC3.CheckBox {
                visible: root.hasProp("rotateLayout");
                text: "Rotate layout";
                id: rotateLayoutCheckBox;
                checked: false;
                onClicked: {
                    root.engineSettings.rotateLayout = this.checked;
                    root.saveSettingsFn();
                }
            }
            PC3.CheckBox {
                visible: root.hasProp("swapInsertSide");
                text: "Swap insert side";
                id: swapInsertSideCheckBox;
                checked: false;
                onClicked: {
                    root.engineSettings.swapInsertSide = this.checked;
                    root.saveSettingsFn();
                }
            }
            PC3.CheckBox {
                visible: root.hasProp("keepMaster");
                text: "Keep master";
                id: keepMasterCheckBox;
                checked: false;
                onClicked: {
                    root.engineSettings.keepMaster = this.checked;
                    root.saveSettingsFn();
                }
            }
            PC3.CheckBox {
                visible: root.hasProp("insertInActive");
                text: "Insert in active tile";
                id: insertInActiveCheckBox;
                checked: false;
                onClicked: {
                    root.engineSettings.insertInActive = this.checked;
                    root.saveSettingsFn();
                }
            }

            // why does PC3 not have a double spin box???
            PC3.SpinBox {
                Kirigami.FormData.label: "Middle split (%):";
                visible: root.hasProp("middleSplit");
                from: 15;
                to: 85;
                id: middleSplitSpinBox;
                value: 50;
                onValueModified: {
                    root.engineSettings.middleSplit = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            PC3.SpinBox {
                Kirigami.FormData.label: "Side 1 size (%):";
                visible: root.hasProp("side1Size");
                from: 15;
                id: side1SizeSpinBox;
                to: 85 - side2SizeSpinBox.value;
                value: 25;
                onValueModified: {
                    root.engineSettings.side1Size = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            PC3.SpinBox {
                Kirigami.FormData.label: "Side 2 size (%):";
                visible: root.hasProp("side2Size");
                from: 15;
                id: side2SizeSpinBox;
                to: 85 - side1SizeSpinBox.value;
                value: 25;
                onValueModified: {
                    root.engineSettings.side2Size = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            PC3.SpinBox {
                Kirigami.FormData.label: "Pillars:";
                visible: root.hasProp("pillarCount");
                from: 1;
                to: 10;
                id: pillarCountSpinBox;
                value: 3;
                onValueModified: {
                    root.engineSettings.pillarCount = this.value;
                    root.saveSettingsFn();
                }
            }
            PC3.SpinBox {
                Kirigami.FormData.label: "Page width (%):";
                visible: root.hasProp("pageWidth");
                from: 15;
                to: 20;
                id: pageWidthSpinBox;
                value: 15;
                onValueModified: {
                    root.engineSettings.pageWidth = this.value / 100;
                    root.saveSettingsFn();
                }
            }
            // btree insertion style
            PC3.ComboBox {
                Kirigami.FormData.label: "Insertion style:";
                visible: root.hasProp("insertionStyle") && root.engineType === 0;
                id: btreeInsertionStyleComboBox;
                model: ["Shallow", "Dwindle", "Spiral"];
                currentIndex: 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineSettings.insertionStyle = idx;
                    root.saveSettingsFn();
                }
            }
            // pillars insertion style
            PC3.ComboBox {
                Kirigami.FormData.label: "Insertion style:";
                visible: root.hasProp("insertionStyle") && root.engineType === 3;
                id: pillarsInsertionStyleComboBox;
                model: ["Rows", "Snake", "Rows Up", "Snake Up"];
                currentIndex: 0;
                popup.y: height;
                onActivated: (idx) => {
                    root.engineSettings.insertionStyle = idx;
                    root.saveSettingsFn();
                }
            }
        }

        Kirigami.Separator {
            Layout.fillWidth: true;
        }

        // dialog button box - destructive/secondary action on the left, close on the right
        RowLayout {
            Layout.margins: Kirigami.Units.largeSpacing;
            Layout.topMargin: 0;
            spacing: Kirigami.Units.smallSpacing;

            PC3.Button {
                icon.name: "edit-reset";
                text: "Reset to Defaults";
                onClicked: {
                    root.resetSettings(
                        root.desktop,
                        root.activity,
                        root.output,
                    );
                }
            }
            Item {
                Layout.fillWidth: true;
            }
            PC3.Button {
                icon.name: "dialog-close";
                text: "Close";
                onClicked: {
                    root.hide();
                }
            }
        }
    }
}
