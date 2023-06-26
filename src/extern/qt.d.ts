// obviously not all of qt, only the stuff I need

declare namespace Qt {
    interface QRect {
        x: number;
        y: number;
        width: number;
        height: number;
    }
    interface QPoint {
        x: number;
        y: number;
    }
    class QByteArray {}

    // taken from https://github.com/RubixDev/kwin-types/blob/main/src/qt.d.ts
    /** The timer type indicates how accurate a timer can be */
    enum TimerType {
        /** Precise timers try to keep millisecond accuracy */
        PreciseTimer = 0,
        /** Coarse timers try to keep accuracy within 5% of the desired interval */
        CoarseTimer = 1,
        /** Very coarse timers only keep full second accuracy */
        VeryCoarseTimer = 2
    }
    
    // qtimer from qml has some weird quirks
    interface QTimer {
        interval: number;
        // false on this means singleshot = true
        repeat: boolean;
        running: boolean;
        triggeredOnStart: boolean;
        // timeout signal from other timer
        triggered: Signal<() => void>;
        // this is start from C/JS timer (start here doesn't restart)
        restart(): void;
        start(): void;
        stop(): void;
    }
}

// more complex than this, cant be iterated over
type QList<T> = Array<T>;

