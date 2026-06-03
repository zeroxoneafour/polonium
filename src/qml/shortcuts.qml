// shortcuts.qml - Shortcuts

import QtQuick;
import org.kde.kwin;

Item {
    id: shortcuts;
    
    function getToggleActiveTiling() {
        return toggleActiveTiling;
    }
    ShortcutHandler {
        id: toggleActiveTiling;
        
        name: "PoloniumToggleActiveTiling";
        text: "Polonium: Toggle Tiling on Active Window";
        sequence: "Meta+Shift+Space";
    }
    // no default shortcuts for specific engines
    function getSetEngineBTree() {
        return setEngineBTree;
    }
    ShortcutHandler {
        id: setEngineBTree;
        
        name: "PoloniumSetEngineBTree";
        text: "Polonium: Use Binary Tree Engine";
        sequence: "";
    }

    function getSetEngineHalf() {
        return setEngineHalf;
    }
    ShortcutHandler {
        id: setEngineHalf;
        
        name: "PoloniumSetEngineHalf";
        text: "Polonium: Use Half Engine";
        sequence: "";
    }

    function getActivateAbove() {
        return activateAbove;
    }
    ShortcutHandler {
        id: activateAbove;
        
        name: "PoloniumactivateAbove";
        text: "Polonium: activate Above";
        sequence: "Meta+K";
    }

    function getActivateBelow() {
        return activateBelow;
    }
    ShortcutHandler {
        id: activateBelow;
        
        name: "PoloniumActivateBelow";
        text: "Polonium: Activate Below";
        sequence: "Meta+J";
    }

    function getActivateLeft() {
        return activateLeft;
    }
    ShortcutHandler {
        id: activateLeft;
        
        name: "PoloniumActivateLeft";
        text: "Polonium: Activate Left";
        sequence: "Meta+H";
    }

    function getActivateRight() {
        return activateRight;
    }
    ShortcutHandler {
        id: activateRight;
        
        name: "PoloniumActivateRight";
        text: "Polonium: Activate Right";
        sequence: "Meta+L";
    }

    function getPlaceAbove() {
        return placeAbove;
    }
    ShortcutHandler {
        id: placeAbove;
        
        name: "PoloniumPlaceAbove";
        text: "Polonium: Place Window Above";
        sequence: "Meta+Shift+K";
    }

    function getPlaceBelow() {
        return placeBelow;
    }
    ShortcutHandler {
        id: placeBelow;
        
        name: "PoloniumPlaceBelow";
        text: "Polonium: Place Window Below";
        sequence: "Meta+Shift+J";
    }

    function getPlaceLeft() {
        return placeLeft;
    }
    ShortcutHandler {
        id: placeLeft;
        
        name: "PoloniumPlaceLeft";
        text: "Polonium: Place Window Left";
        sequence: "Meta+Shift+H";
    }

    function getPlaceRight() {
        return placeRight;
    }
    ShortcutHandler {
        id: placeRight;
        
        name: "PoloniumPlaceRight";
        text: "Polonium: Place Window Right";
        sequence: "Meta+Shift+L";
    }

    function getResizeUp() {
        return resizeUp;
    }
    ShortcutHandler {
        id: resizeUp;
        
        name: "PoloniumResizeUp";
        text: "Polonium: Resize Tile Up";
        sequence: "Meta+Ctrl+K";
    }

    function getResizeDown() {
        return resizeDown;
    }
    ShortcutHandler {
        id: resizeDown;
        
        name: "PoloniumResizeDown";
        text: "Polonium: Resize Tile Down";
        sequence: "Meta+Ctrl+J";
    }

    function getResizeLeft() {
        return resizeLeft;
    }
    ShortcutHandler {
        id: resizeLeft;
        
        name: "PoloniumResizeLeft";
        text: "Polonium: Resize Tile Left";
        sequence: "Meta+Ctrl+H";
    }

    function getResizeRight() {
        return resizeRight;
    }
    ShortcutHandler {
        id: resizeRight;
        
        name: "PoloniumResizeRight";
        text: "Polonium: Resize Tile Right";
        sequence: "Meta+Ctrl+L";
    }

    /*
    
    function getOpenSettings() {
        return openSettings;
    }
    ShortcutHandler {
        id: openSettings;
        
        name: "PoloniumOpenSettings";
        text: "Polonium: Open Settings Dialog";
        sequence: "Meta+\\";
    }
    
    function getRotateLayout() {
        return rotateLayout;
    }
    ShortcutHandler {
        id: rotateLayout;

        name: "PoloniumRotateLayout";
        text: "Polonium: Rotate Layout";
        sequence: "";
    }
    
    function getCycleEngine() {
        return cycleEngine;
    }
    ShortcutHandler {
        id: cycleEngine;
        
        name: "PoloniumCycleEngine";
        text: "Polonium: Cycle Engine";
        sequence: "Meta+|";
    }
    
    function getSwitchThreeColumn() {
        return switchThreeColumn;
    }
    ShortcutHandler {
        id: switchThreeColumn;
        
        name: "PoloniumSwitchThreeColumn";
        text: "Polonium: Use Three Column Engine";
        sequence: "";
    }
    
    function getSwitchMonocle() {
        return switchMonocle;
    }
    ShortcutHandler {
        id: switchMonocle;
        
        name: "PoloniumSwitchMonocle";
        text: "Polonium: Use Monocle Engine";
        sequence: "";
    }
    
    function getSwitchKwin() {
        return switchKwin;
    }
    ShortcutHandler {
        id: switchKwin;
        
        name: "PoloniumSwitchKwin";
        text: "Polonium: Use KWin Engine";
        sequence: "";
    }
    */
}