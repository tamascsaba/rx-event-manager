var EVENT_DELIMITER = ' ';

/**
 * required dependencies
 */
var Rx = require('rx');

var eventManagerCore = new Rx.Subject();

var eventManagerCoreObservable = eventManagerCore.asObservable();

/**
 * A hash of { eventName: eventObservable }
 *
 * @private
 * @property observables
 * @type {Object}
 */
var observables = {};

/**
 * A hash of { eventName: [eventSubscription1, eventSubscription2, ...] }
 *
 * @private
 * @property subscriptions
 * @type {Object}
 */
var subscriptions = {};

var neverTerminateObservable = Rx.Observable.create(function (o) {
    function handle(e) {
        try {
            o.onNext(e);
        } catch (ex) {
            o.onError(ex);
        }
    }

    eventManagerCoreObservable.subscribe(handle, o.onError.bind(o), o.onCompleted.bind(o));

    return function disposeNoop() { };
});

function _isInvalidString(value) {
    return ('string' !== typeof value) || (0 === value.length);
}

function _getEventData(event) {
    return event.data;
}

function _getEvents(event) {
    return event.split(EVENT_DELIMITER);
}

function _register(event, subscription) {
    if (Array.isArray(subscriptions[event])) {
        subscriptions[event].push(subscription);
    } else {
        subscriptions[event] = [subscription];
    }
}

/**
 * A helper to allow inter module communication.
 *
 * @module EventManager
 */
var EventManager = {

    /**
     * observe with given `event`.
     * Note: It's caller's duty to dispose returned subscription.
     *
     * @usage
     *
     * 1. single event
     *
     * EventManager.observe('ios').subscribe(function (data) {
     *     console.log(data.answer);
     * });
     *
     * EventManager.fire('ios', { answer: 42 })
     * > 42
     *
     * @method observe
     * @param {String} event event name.
     * @return {[Rx.Observable]}
     * @throws TypeError if given `event` is not a valid string
     */
    observe: function observe(event) {
        var originalSubscribe;

        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }

        if ( ! observables[event]) {
            observables[event] = neverTerminateObservable.
                filter(function (data) {
                    return event === data.event;
                }).
                map(_getEventData);
        }

        originalSubscribe = observables[event].subscribe;

        observables[event].subscribe = function observableSubscribe() {

            var subscription = originalSubscribe.apply(observables[event], arguments);

            _register(event, subscription);

            return subscription;
        };

        return observables[event];
    },

    /**
     * subscribe to given `event`.
     *
     * @usage
     *
     * 1. single event
     *
     * EventManager.on('ios', function (data) {
     *     console.log(data.answer);
     * });
     *
     * EventManager.fire('ios', { answer: 42 })
     * > 42
     *
     * 2. multiple events (space separated)
     *
     * EventManager.on('hello world', function (data) {
     *    console.log(data.answer);
     * });
     *
     * EventManager.fire('hello', { answer: 42 })
     * > 42
     *
     * EventManager.fire('world', { answer: 42 })
     * > 42
     *
     * @method on
     * @param {String} event event name.
     * @return {Disposable}
     */
    on: function on(event, onNext, onError, onCompleted) {

        var subscription = this.observe(event).subscribe(onNext, onError, onCompleted);

        _register(event, subscription);

        return subscription;
    },

    /**
     * execute callback only once and dispose it self.
     *
     * @method once
     * @see on
     */
    once: function once(event, onNext, onError, onCompleted) {

        var subscription = this.observe(event).take(1).subscribe(onNext, onError, onCompleted);

        _register(event, subscription);

        return subscription;
    },

    /**
     * dispatch `event` with given `data`.
     *
     * @method fire
     * @param {String} event event name
     * @param {Object} data anything
     * @throws TypeError if given `event` is not a valid string
     * @chainable
     */
    fire: function fire(event, data) {

        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }

        eventManagerCore.onNext({ event: event, data: data });

        return this;
    },

    /**
     * @usage
     *
     * EventManager.on('hello', function (value) {
     *     console.log(value);
     * });
     *
     * EventManager.fire('hello', 42);
     * > 42
     *
     * EventManager.dispose('hello');
     *
     * EventManager.fire('hello', 42);
     * // nothing happened
     *
     * @method dispose
     * @param {String} event event name.
     */
    dispose: function dispose(event) {

        if (Array.isArray(subscriptions[event])) {
            subscriptions[event].forEach(function (s) {
                s.dispose();
            });

            delete subscriptions[event];
        }

        return this;
    }
};

module.exports = EventManager;
