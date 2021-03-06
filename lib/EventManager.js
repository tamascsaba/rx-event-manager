var Subscriber_1 = require('rxjs/Subscriber');
var Subject_1 = require('rxjs/Subject');
require('rxjs/add/operator/filter');
require('rxjs/add/operator/map');
require('rxjs/add/operator/take');
require('rxjs/add/operator/distinctUntilChanged');
require('rxjs/add/operator/distinctUntilKeyChanged');
var eventManagerCore = new Subject_1.Subject();
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
 * @param {Subscription} subscription
 * @return {Subscription}
 */
function _registerSubscription(event, subscription) {
    if (Array.isArray(subscriptions[event])) {
        subscriptions[event].push(subscription);
    }
    else {
        subscriptions[event] = [subscription];
    }
    return subscription;
}
/**
 *
 * @class EventManager
 */
var EventManager = (function () {
    function EventManager() {
    }
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
     * @throws TypeError if given `event` is not a valid string
     */
    EventManager.prototype.observe = function (event) {
        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }
        if (!observables[event]) {
            observables[event] = eventManagerCore
                .filter(function (e) { return event === e.event; })
                .map(function (e) { return e.data; });
        }
        var observable = observables[event];
        var originalSubscribe = observable.subscribe;
        observable.subscribe = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            return _registerSubscription(event, originalSubscribe.call.apply(originalSubscribe, [observable].concat(args)));
        };
        return observable;
    };
    /**
     * subscribe to given `event`.
     *
     * @usage
     *
     * EventManager.on('ios', (data) => {
     *     console.log(data.answer);
     * });
     *
     * EventManager.fire('ios', { answer: 42 })
     * > 42
     *
     * multiple events (space separated)
     *
     * EventManager.on('hello world', (data) => {
     *    console.log(data.answer);
     * });
     *
     * EventManager.fire('hello', { answer: 42 })
     * > 42
     *
     * EventManager.fire('world', { answer: 42 })
     * > 42
     */
    EventManager.prototype.on = function (event, next, error, complete) {
        return _registerSubscription(event, this.observe(event).subscribe(next, error, complete));
    };
    /**
     * execute callback only once and dispose it self.
     * @see on
     */
    EventManager.prototype.once = function (event, next, error, complete) {
        return _registerSubscription(event, this.observe(event).take(1).subscribe(next, error, complete));
    };
    /**
     * Emits latest-persisted sequence (if available)
     */
    EventManager.prototype.latest = function (event, next, error, complete) {
        var observable, observer, latestData, subscription;
        observable = this.observe(event);
        if (undefined === next) {
            return observable;
        }
        observer = Subscriber_1.Subscriber.create(next, error, complete);
        subscription = observable.subscribe(observer);
        latestData = latestEventData[event];
        if (latestData && true === latestData.hasValue) {
            setImmediate(function () {
                observer.next(latestData.value);
            });
        }
        return _registerSubscription(event, subscription);
    };
    /**
     * Emits value only if it's changed (determined by `comparer`)
     *
     * @method change
     * @param {String} event event name.
     * @param {Function} [comparer] default to `_defaultComparer`
     * @param {Function} [next]
     * @param {Function} [error]
     * @param {Function} [complete]
     * @return {Subscription}
     */
    EventManager.prototype.change = function (event, comparer, next, error, complete) {
        var observable;
        comparer = comparer || _defaultComparer;
        if (_isNotFunction(comparer)) {
            throw new TypeError('comparer should be a function');
        }
        observable = this.observe(event).distinctUntilChanged(_keySelector);
        if (undefined === next) {
            return observable;
        }
        return _registerSubscription(event, observable.subscribe(next, error, complete));
    };
    /**
     * Same as fire method
     */
    EventManager.prototype.trigger = function (event, data) {
        return this.fire(event, data);
    };
    /**
     * dispatch `event` with given `data`.
     *
     * @usage
     *
     * EventManager.fire('hello', 42);
     * > 42
     *
     * @method fire
     * @param {String} event event name
     * @param {Object} data anything
     * @throws TypeError if given `event` is not a valid string
     * @chainable
     */
    EventManager.prototype.fire = function (event, data) {
        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }
        if (!latestEventData[event]) {
            latestEventData[event] = { hasValue: true };
        }
        latestEventData[event].value = data;
        eventManagerCore.next({ event: event, data: data });
        return this;
    };
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
     * EventManager.off('hello');
     *
     * EventManager.fire('hello', 42);
     * // nothing happened
     *
     * @method off
     * @param {String} event event name.
     */
    EventManager.prototype.off = function (event) {
        if (Array.isArray(subscriptions[event])) {
            subscriptions[event].forEach(function (s) { return s.unsubscribe(); });
            delete subscriptions[event];
        }
        if (latestEventData[event]) {
            delete latestEventData[event];
        }
        return this;
    };
    /**
     * off all subscriptions
     *
     * @method offAll
     * @chainable
     */
    EventManager.prototype.offAll = function () {
        var _this = this;
        Object.keys(subscriptions).forEach(function (event) { return _this.off(event); });
        return this;
    };
    return EventManager;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventManager;
;
module.exports = EventManager;
