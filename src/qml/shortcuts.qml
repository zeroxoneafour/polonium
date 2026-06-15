// shortcuts.qml - Shortcuts

import QtQuick;
import org.kde.kwin;

Item {
    id: shortcuts;
    
    function toggleActiveTiling() {
        return toggleActiveTilingObj;
    }
    ShortcutHandler {
        id: toggleActiveTilingObj;
        
        name: "PoloniumToggleActiveTiling";
        text: "Polonium: Toggle Tiling on Active Window";
        sequence: "Meta+Shift+Space";
    }
    // no default shortcuts for specific engines
    function setEngineBTree() {
        return setEngineBTreeObj;
    }
    ShortcutHandler {
        id: setEngineBTreeObj;
        
        name: "PoloniumSetEngineBTree";
        text: "Polonium: Use Binary Tree Engine";
        sequence: "";
    }

    function setEngineHalf() {
        return setEngineHalfObj;
    }
    ShortcutHandler {
        id: setEngineHalfObj;
        
        name: "PoloniumSetEngineHalf";
        text: "Polonium: Use Half Engine";
        sequence: "";
    }

    function activateAbove() {
        return activateAboveObj;
    }
    ShortcutHandler {
        id: activateAboveObj;
        
        name: "PoloniumActivateAbove";
        text: "Polonium: Activate Above";
        sequence: "Meta+K";
    }

    function activateBelow() {
        return activateBelowObj;
    }
    ShortcutHandler {
        id: activateBelowObj;
        
        name: "PoloniumActivateBelow";
        text: "Polonium: Activate Below";
        sequence: "Meta+J";
    }

    function activateLeft() {
        return activateLeftObj;
    }
    ShortcutHandler {
        id: activateLeftObj;
        
        name: "PoloniumActivateLeft";
        text: "Polonium: Activate Left";
        sequence: "Meta+H";
    }

    function activateRight() {
        return activateRightObj;
    }
    ShortcutHandler {
        id: activateRightObj;
        
        name: "PoloniumActivateRight";
        text: "Polonium: Activate Right";
        sequence: "Meta+L";
    }

    function placeAbove() {
        return placeAboveObj;
    }
    ShortcutHandler {
        id: placeAboveObj;
        
        name: "PoloniumPlaceAbove";
        text: "Polonium: Place Window Above";
        sequence: "Meta+Shift+K";
    }

    function placeBelow() {
        return placeBelowObj;
    }
    ShortcutHandler {
        id: placeBelowObj;
        
        name: "PoloniumPlaceBelow";
        text: "Polonium: Place Window Below";
        sequence: "Meta+Shift+J";
    }

    function placeLeft() {
        return placeLeftObj;
    }
    ShortcutHandler {
        id: placeLeftObj;
        
        name: "PoloniumPlaceLeft";
        text: "Polonium: Place Window Left";
        sequence: "Meta+Shift+H";
    }

    function placeRight() {
        return placeRightObj;
    }
    ShortcutHandler {
        id: placeRightObj;
        
        name: "PoloniumPlaceRight";
        text: "Polonium: Place Window Right";
        sequence: "Meta+Shift+L";
    }

    function resizeUp() {
        return resizeUpObj;
    }
    ShortcutHandler {
        id: resizeUpObj;
        
        name: "PoloniumResizeUp";
        text: "Polonium: Resize Tile Up";
        sequence: "Meta+Ctrl+K";
    }

    function resizeDown() {
        return resizeDownObj;
    }
    ShortcutHandler {
        id: resizeDownObj;
        
        name: "PoloniumResizeDown";
        text: "Polonium: Resize Tile Down";
        sequence: "Meta+Ctrl+J";
    }

    function resizeLeft() {
        return resizeLeftObj;
    }
    ShortcutHandler {
        id: resizeLeftObj;
        
        name: "PoloniumResizeLeft";
        text: "Polonium: Resize Tile Left";
        sequence: "Meta+Ctrl+H";
    }

    function resizeRight() {
        return resizeRightObj;
    }
    ShortcutHandler {
        id: resizeRightObj;
        
        name: "PoloniumResizeRight";
        text: "Polonium: Resize Tile Right";
        sequence: "Meta+Ctrl+L";
    }
    
    function toggleSettingsMenu() {
        return toggleSettingsMenuObj;
    }
    ShortcutHandler {
        id: toggleSettingsMenuObj;
        
        name: "PoloniumToggleSettingsMenu";
        text: "Polonium: Toggle Settings Menu";
        sequence: "Meta+\\";
    }

    /*
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