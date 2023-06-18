// obviously not all of qt, only the stuff I need

declare namespace Qt {
    class QRect {
        x: number;
        y: number;
        width: number;
        height: number;
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
}


// taken from https://github.com/RubixDev/kwin-types/blob/main/src/qt.d.ts
/**
 * The QTimer class provides repetitive and single-shot timers.
 */
declare class QTimer {
    /**
     * This property holds whether the timer is a single-shot timer
     *
     * A single-shot timer fires only once, non-single-shot timers fire every interval milliseconds.
     *
     * The default value for this property is false.
     * @see {@link interval}
     */
    singleShot: boolean
    /**
     * This property holds the timeout interval in milliseconds
     *
     * The default value for this property is 0. A QTimer with a timeout interval of 0
     * will time out as soon as all the events in the window system's event queue
     * have been processed.
     * @see {@link singleShot}
     */
    interval: number
    /**
     * This property holds the remaining time in milliseconds
     *
     * Returns the timer's remaining value in milliseconds left until the timeout.
     * If the timer is inactive, the returned value will be -1. If the timer is overdue,
     * the returned value will be 0.
     * @since 5.0
     * @see {@link interval}
     */
    readonly remainingTime: number
    /**
     * controls the accuracy of the timer
     *
     * The default value for this property is {@link TimerType.CoarseTimer}.
     * @see {@link TimerType}
     */
    timerType: Qt.TimerType
    /**
     * This boolean property is true if the timer is running; otherwise false
     * @since 4.3
     */
    readonly active: boolean

    /**
     * This signal is emitted when the timer times out.
     *
     * **Note:** This is a private signal. It can be used in signal connections but cannot be emitted by the user.
     * @see {@link QTimer.interval interval}, {@link QTimer.start start}, {@link QTimer.stop stop}
     */
    readonly timeout: Signal<() => void>

    /**
     * Starts or restarts the timer with the timeout specified in {@link interval}.
     *
     * If the timer is already running, it will be stopped and restarted.
     *
     * If {@link singleShot} is true, the timer will be activated only once.
     */
    start(): void
    /**
     * Starts or restarts the timer with a timeout interval of {@link msec} milliseconds.
     *
     * If the timer is already running, it will be stopped and restarted.
     *
     * If {@link singleShot} is true, the timer will be activated only once.
     */
    start(msec: number): void
    /**
     * Stops the timer.
     * @see {@link start}
     */
    stop(): void
}
