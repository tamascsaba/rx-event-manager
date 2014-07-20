/**
 * required dependencies
 */
var Rx = require('rx');

var eventManagerCore = new Rx.Subject();

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

/**
 * An object which manages the most recent data of events.
 *
 * @private
 * @property latestEventData
 * @type {Object}
 */
var latestEventData = {};

/**
 * check if given `value` is a non-empty string
 *
 * @private
 * @method _isInvalidString
 * @param {Object} value
 * @return {Boolean}
 */
function _isInvalidString(value) {
    return ('string' !== typeof value) || (0 === value.length);
}

/**
 * check if given `value` is NOT an instance of function
 *
 * @private
 * @method _isNotFunction
 * @param {Object} value
 * @return {Boolean}
 */
function _isNotFunction(value) {
    return 'function' !== typeof value;
}

/**
 * @private
 * @method _keySelector
 * @param {Object} data
 */
function _keySelector(data) { return data; }

/**
 * compare any 2 given objects and return their equality by ===.
 *
 * @private
 * @method _defaultComparer
 * @param {Object} x anything
 * @param {Object} y anything
 * @return {Boolean}
 */
function _defaultComparer(x, y) { return x === y; }

/**
 * A helper to memorize event and correspoinding subscription.
 *
 * @private
 * @method _registerSubscription
 * @param {String} event
 * @param {Rx.Disposable} subscription
 * @return {Rx.Disposable}
 */
function _registerSubscription(event, subscription) {
    if (Array.isArray(subscriptions[event])) {
        subscriptions[event].push(subscription);
    } else {
        subscriptions[event] = [subscription];
    }
    
    return subscription;
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
            observables[event] = eventManagerCore.
                filter(function filterEventName(e) {
                    return event === e.event;
                }).
                map(function mapEventData(e) {
                    return e.data;
                });
        }

        originalSubscribe = observables[event].subscribe;

        observables[event].subscribe = function observableSubscribe() {
            return _registerSubscription(event, originalSubscribe.apply(observables[event], arguments));
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
        return _registerSubscription(event, this.observe(event).subscribe(onNext, onError, onCompleted));
    },

    /**
     * execute callback only once and dispose it self.
     *
     * @method once
     * @see on
     */
    once: function once(event, onNext, onError, onCompleted) {
        return _registerSubscription(event, this.observe(event).take(1).subscribe(onNext, onError, onCompleted));
    },

    /**
     * Emits latest-persisted sequence (if available)
     *
     * @method latest
     * @param {String} event event name.
     * @param {Function} [onNext]
     * @param {Function} [onError]
     * @param {Function} [onCompleted]
     * @return {Rx.Observable|Rx.Disposable}
     */
    latest: function latest(event, onNext, onError, onCompleted) {
        var observable,
            observer,
            latestData,
            subscription;

        observable = this.observe(event);

        if (undefined === onNext) { return observable; }

        observer = Rx.Observer.create(onNext, onError, onCompleted);

        subscription = observable.subscribe(observer);

        latestData = latestEventData[event];

        if (latestData && true === latestData.hasValue) {
            observer.onNext(latestData.value);
        }

        return _registerSubscription(event, subscription);
    },

    /**
     * Emits value only if it's changed (determined by `comparer`)
     *
     * @method change
     * @param {String} event event name.
     * @param {Function} [comparer] default to `_defaultComparer`
     * @param {Function} [onNext]
     * @param {Function} [onError]
     * @param {Function} [onCompleted]
     * @return {Rx.Observable|Rx.Disposable}
     */
    change: function change(event, comparer, onNext, onError, onCompleted) {

        var observable;

        comparer = comparer || _defaultComparer;

        if (_isNotFunction(comparer)) {
            throw new TypeError('comparer should be a function');
        }
        
        observable = this.observe(event).
            distinctUntilChanged(_keySelector, comparer);

        if (undefined === onNext) { return observable; }

        return _registerSubscription(event, observable.subscribe(onNext, onError, onCompleted));
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

        if ( ! latestEventData[event]) {
            latestEventData[event] = { hasValue: true };
        }

        latestEventData[event].value = data;

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
            subscriptions[event].forEach(function disposeSubscription(s) {
                s.dispose();
            });

            delete subscriptions[event];
        }

        if (latestEventData[event]) {
            delete latestEventData[event];
        }

        return this;
    }
};

module.exports = EventManager;
