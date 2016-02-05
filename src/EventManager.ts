import {Subscription} from 'rxjs/Subscription';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';
import {Subscriber} from 'rxjs/Subscriber';
import {Subject} from 'rxjs/Subject';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/distinctUntilKeyChanged';

const eventManagerCore = new Subject();

/**
 * A hash of { eventName: eventObservable }
 *
 * @private
 * @property observables
 * @type {Object}
 */
const observables: { [x: string]: Observable<any> } = {};

/**
 * A hash of { eventName: [eventSubscription1, eventSubscription2, ...] }
 *
 * @private
 * @property subscriptions
 * @type {Object}
 */
const subscriptions: { [x: string]: Array<Subscription<any>> } = {};

/**
 * An object which manages the most recent data of events.
 *
 * @private
 * @property latestEventData
 * @type {Object}
 */
const latestEventData = {};

/**
 * check if given `value` is a non-empty string
 *
 * @private
 * @method _isInvalidString
 * @param {Object} value
 * @return {Boolean}
 */
function _isInvalidString(value: string): boolean {
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
function _isNotFunction(value: Function): boolean {
    return 'function' !== typeof value;
}

/**
 * @private
 * @method _keySelector
 * @param {Object} data
 */
function _keySelector<T>(data: T): T { return data; }

/**
 * compare any 2 given objects and return their equality by ===.
 *
 * @private
 * @method _defaultComparer
 * @param {Object} x anything
 * @param {Object} y anything
 * @return {Boolean}
 */
function _defaultComparer(x: any, y: any): boolean { return x === y; }

/**
 * A helper to memorize event and correspoinding subscription.
 *
 * @private
 * @method _registerSubscription
 * @param {String} event
 * @param {Subscription} subscription
 * @return {Subscription}
 */
function _registerSubscription(event: string, subscription: any): Subscription<any> {
    if (Array.isArray(subscriptions[event])) {
        subscriptions[event].push(subscription);
    } else {
        subscriptions[event] = [subscription];
    }

    return subscription;
}

/**
 *
 * @class EventManager
 */
export default class EventManager<T> {

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
    observe(event): Observable<T> {
        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }

        if (!observables[event]) {
            observables[event] = eventManagerCore
                .filter((e: any) => event === e.event)
                .map((e: any) => e.data);
        }

        const observable = observables[event];
        const originalSubscribe = observable.subscribe;


        observable.subscribe = (...args) => {
            return _registerSubscription(
                event,
                originalSubscribe.call(observable, ...args)
            );
        };

        return observable;
    }

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
    on(
        event: string,
        next?: Observer<T> | ((value: T) => void),
        error?: (error: T) => void,
        complete?: () => void
    ): Subscription<T> {
        return _registerSubscription(
            event,
            this.observe(event).subscribe(next, error, complete)
        );
    }

    /**
     * execute callback only once and dispose it self.
     * @see on
     */
    once(
        event: string,
        next?: Observer<T> | ((value: T) => void),
        error?: (error: T) => void,
        complete?: () => void
    ): Subscription<T> {
        return _registerSubscription(
            event,
            this.observe(event).take(1).subscribe(next, error, complete)
        );
    }

    /**
     * Emits latest-persisted sequence (if available)
     */
    latest(
        event: string,
        next?: ((value?: T) => void),
        error?: (error: T) => void,
        complete?: () => void
    ): Subscription<T> {
        let observable,
            observer,
            latestData,
            subscription;

        observable = this.observe(event);

        if (undefined === next) { return observable; }

        observer = Subscriber.create(next, error, complete);

        subscription = observable.subscribe(observer);

        latestData = latestEventData[event];

        if (latestData && true === latestData.hasValue) {
            setImmediate(function () {
                observer.next(latestData.value);
            });
        }

        return _registerSubscription(event, subscription);
    }

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
    change(
        event: string,
        comparer: Function,
        next?: Observer<T> | ((value: T) => void),
        error?: (error: T) => void,
        complete?: () => void
    ) {

        let observable;

        comparer = comparer || _defaultComparer;

        if (_isNotFunction(comparer)) {
            throw new TypeError('comparer should be a function');
        }

        observable = this.observe(event).distinctUntilChanged(_keySelector);

        if (undefined === next) { return observable; }

        return _registerSubscription(event, observable.subscribe(next, error, complete));
    }

    /**
     * Same as fire method
     */
    trigger(event: string, data: T): EventManager<T> {
        return this.fire(event, data);
    }

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
    fire(event: string, data: T): EventManager<T> {

        if (_isInvalidString(event)) {
            throw new TypeError('given event is not a valid string');
        }

        if ( ! latestEventData[event]) {
            latestEventData[event] = { hasValue: true };
        }

        latestEventData[event].value = data;

        eventManagerCore.next({ event: event, data: data });

        return this;
    }

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
    off(event: string): EventManager<T> {
        if (Array.isArray(subscriptions[event])) {
            subscriptions[event].forEach((s) => s.unsubscribe());

            delete subscriptions[event];
        }

        if (latestEventData[event]) {
            delete latestEventData[event];
        }

        return this;
    }

    /**
     * off all subscriptions
     *
     * @method offAll
     * @chainable
     */
    offAll(): EventManager<T> {

        Object.keys(subscriptions).forEach((event) => this.off(event));

        return this;
    }
};


module.exports = EventManager;
