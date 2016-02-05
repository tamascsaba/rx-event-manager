import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
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
    observe(event: any): Observable<T>;
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
    on(event: string, next?: Observer<T> | ((value: T) => void), error?: (error: T) => void, complete?: () => void): Subscription<T>;
    /**
     * execute callback only once and dispose it self.
     * @see on
     */
    once(event: string, next?: Observer<T> | ((value: T) => void), error?: (error: T) => void, complete?: () => void): Subscription<T>;
    /**
     * Emits latest-persisted sequence (if available)
     */
    latest(event: string, next?: ((value?: T) => void), error?: (error: T) => void, complete?: () => void): Subscription<T>;
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
    change(event: string, comparer: Function, next?: Observer<T> | ((value: T) => void), error?: (error: T) => void, complete?: () => void): any;
    /**
     * Same as fire method
     */
    trigger(event: string, data: T): EventManager<T>;
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
    fire(event: string, data: T): EventManager<T>;
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
    off(event: string): EventManager<T>;
    /**
     * off all subscriptions
     *
     * @method offAll
     * @chainable
     */
    offAll(): EventManager<T>;
}
