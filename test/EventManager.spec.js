// Node.js modules
var assert = require('assert');
var Rx = require('rxjs');

var EventManager = require('../lib/EventManager');
var eventManager = new EventManager();

var HELLO = 'event.hello';
var WORLD = 'event.world';

describe('EventManager', function() {

    describe('observe', function() {

        it('should throw error if given event is not a valid string', function() {

            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.observe(''); });
            });
        });

        it('should return an Observable instance', function() {
            assert.ok(eventManager.observe(HELLO) instanceof Rx.Observable);
        });

        it('should execute callback when event got fired', function(done) {
            var max = 10,
                count = 0;

            eventManager.observe(HELLO).take(max).subscribe(
                function (data) {
                    count++;
                    assert.strictEqual('world', data.hello);
                },
                function (ex) {},
                function () {
                    assert.strictEqual(count, max);
                    done();
                }
            );

            for (var i = 0; i < max; i++) {
                eventManager.fire(HELLO, { hello: 'world' });
            }
        });
    });

    describe('fire', function() {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.fire(invalidInput); });
            });
        });

        it('should be chainable', function() {
            assert.strictEqual(eventManager.fire(HELLO).fire(WORLD), eventManager, 'fire should be chainable');
        });

        it('should fire event with given context', function(done) {

            eventManager.on(HELLO, function (data) {
                assert.strictEqual('world', data.hello, 'data.hello should be `world`');
            });

            eventManager.fire(HELLO, { hello: 'world' });

            done();
        });
    });

    describe('on', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.on(invalidInput); });
            });
        });

        it('should return an Observer instance which can do unsubscribe', function() {
            var subscription = eventManager.on(HELLO);

            assert.ok(subscription instanceof Rx.Subscriber);
            assert.strictEqual(typeof subscription.unsubscribe, 'function', 'subscription.unsubscribe should be a function');
        });
    });

    describe('once', function() {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.once(invalidInput); });
            });
        });

        it('should return an Observer instance', function() {
            var subscription = eventManager.once(HELLO);

            assert.ok(subscription instanceof Rx.Subscriber);
            assert.strictEqual(typeof subscription.unsubscribe, 'function', 'subscription.unsubscribe should be a function');
        });

        it('should execute callback only once', function(done) {
            var count = 0;

            eventManager.once(HELLO,
                function (data) { count++; },
                function (ex) { },
                function () {
                    assert.strictEqual(1, count);
                    done();
                }
            );

            for (var i = 0; i < 10; i++) { eventManager.fire(HELLO); }
        });
    });

    describe('latest', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.latest(invalidInput); });
            });
        });

        it('should return an Observable instance without given next/error/complete', function() {
            assert.ok(eventManager.latest(HELLO) instanceof Rx.Observable);
        });

        it('should return an Observable instance without given next/error/complete', function() {
            assert.ok(eventManager.latest(HELLO) instanceof Rx.Observable);
        });

        it('should return an Subscriber instance with given next', function() {

            var subscription = eventManager.latest(HELLO, function () {});

            assert.ok(subscription instanceof Rx.Subscriber);
            assert.strictEqual(typeof subscription.unsubscribe, 'function', 'subscription.unsubscribe should be a function');
        });

        it('should replay latest (1) value', function (done) {
            var count = 0,
                expect = 42;

            eventManager.fire(HELLO, expect);

            eventManager.latest(HELLO, function (value) {
                assert.strictEqual(value, expect, 'should be invoked immediate with value ' + expect);
                done();
            });
        });

        it('should replay latest (1) value - crazy example', function (done) {
            var count = 0;

            for (; count < 100; count++) {
                eventManager.fire(HELLO, count);
            }

            expect = count - 1;

            eventManager.latest(HELLO, function (value) {
                assert.strictEqual(value, expect, 'should be invoked immediate with value ' + expect);
                done();
            });
        });

        it('should not replay if it is already off-ed', function (done) {
            var expect = 42;

            eventManager.fire(HELLO, 'whatever');

            eventManager.off(HELLO);

            eventManager.latest(HELLO, function (value) {
                assert.strictEqual(value, expect);
                done();
            });

            eventManager.fire(HELLO, expect);
        });
    });

    describe('change', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                assert.throws(function () { eventManager.change(invalidInput); });
            });
        });

        it('should throw error if given event is not a function', function() {
            assert.throws(function () { eventManager.change(HELLO, {}); });
            assert.throws(function () { eventManager.change(HELLO, []); });
        });

        it('should return an Observable instance without given next/error/complete', function() {
            assert.ok(eventManager.change(HELLO) instanceof Rx.Observable);
            assert.ok(eventManager.change(HELLO, function (x, y) { return x === y; }) instanceof Rx.Observable);
        });

        it('should return an Observable instance without given onNext/onError/onCompleted', function() {
            assert.ok(eventManager.change(HELLO) instanceof Rx.Observable);
        });

        it('should return an Subscriber instance with given next', function() {

            var subscription = eventManager.change(HELLO, function (x, y) { return x === y;}, function () {});

            assert.ok(subscription instanceof Rx.Subscriber);
            assert.strictEqual(typeof subscription.unsubscribe, 'function', 'subscription.unsubscribe should be a function');
        });

        it('should fire event only if data is changed', function () {
            var expect = 42,
                count = 0;

            eventManager.change(HELLO).
                subscribe(function (value) {
                    assert.strictEqual(value, expect);
                    assert.strictEqual(0, count);
                });

            eventManager.fire(HELLO, expect);

            count += 1;

            // should not trigger subscribe
            eventManager.fire(HELLO, expect);
        });

        it('should be capable of customizing comparer', function () {
            var expect = 42,
                count = 0;

            function comparer(x, y) { return x.value === y.value; }

            eventManager.change(HELLO, comparer).
                subscribe(function (data) {
                    assert.strictEqual(data.value, expect);
                    assert.strictEqual(0, count);
                });

            eventManager.fire(HELLO, { value: expect });

            count += 1;

            // should not trigger subscribe
            eventManager.fire(HELLO, { value: expect });
        });
    });

    describe('use-case', function () {

        it('should emit sequences only for latest subscriptions while using observe/on and latest', function (done) {
            var expect = 42;

            eventManager.fire(HELLO, expect);

            eventManager.observe(HELLO).
                subscribe(function () {
                    assert.fail('observe should be never invoked');
                });

            eventManager.on(HELLO, function () {
                assert.fail('on should be never invoked');
            });

            eventManager.latest(HELLO, function (value) {
                assert.strictEqual(value, expect);
                done();
            });
        });
    });

    describe('off', function () {

        it('should off with given event via `on`', function () {
            var count = 0;

            eventManager.on(HELLO, function (value) {
                count += value;
            });

            eventManager.fire(HELLO, 1);

            eventManager.off(HELLO);

            eventManager.fire(HELLO, 1);

            assert.strictEqual(count, 1);
        });

        it('should off with given event via `once`', function () {
            var count = 0;

            eventManager.once(HELLO, function (data) {
                count += value;
            });

            eventManager.off(HELLO);

            eventManager.fire(HELLO, 1);

            assert.strictEqual(count, 0);
        });

        it('should off with given event via `observe`', function () {
            var count = 0;

            eventManager.observe(HELLO).subscribe(function (value) {
                count += value;
            });

            eventManager.fire(HELLO, 1);

            eventManager.off(HELLO);

            eventManager.fire(HELLO, 1);

            assert.strictEqual(count, 1);
        });

        it('should off with given event via `observe` which has extra operators', function () {
            var count = 0,
                i;

            eventManager.observe(HELLO).
                // @FIXME oparators crete new instance of Subject which subscribe is no overwrite
                // filter(function (value) {
                //     return value > 5;
                // }).
                subscribe(function (value) {
                    count += value;
                });

            for (i = 0; i < 5; i++) {
                eventManager.fire(HELLO, Math.pow(2, i));
            }

            eventManager.off(HELLO);

            // for (i = 0; i < 5; i++) {
            //     eventManager.fire(HELLO, Math.pow(2, i));
            // }

            assert.strictEqual(count, 31, 'should be sum of 8 + 16');
        });

        it('should not off further subscriptions', function () {
            var count = 0;

            eventManager.on(HELLO, function (value) {
                count += value;
            });

            eventManager.fire(HELLO, 1);

            eventManager.off(HELLO);

            eventManager.fire(HELLO, 2);

            eventManager.on(HELLO, function (value) {
                count += value;
            });

            eventManager.fire(HELLO, 4);

            assert.strictEqual(count, 5, 'should be sum of 1 + 4');
        });

        it('should off with given event - crazy example', function () {
            var events = 'abcdefghijklmnopqrstuvwxyz'.split(''),
                count = 0;

            events.
                forEach(function (event, index) {
                    // subscribe `event`
                    eventManager.on(event, function (value) { count += value; });

                    // fire `event`
                    eventManager.fire(event, Math.pow(2, index));

                    // off `event`
                    eventManager.off(event);

                    // fire `event` again, if it's taking effect
                    // count won't be a number anymore
                    eventManager.fire(event, undefined);
                });

            // 2^0 + 2^1 + ... + 2^25
            assert.strictEqual(count, Math.pow(2, 26) - 1, 'event should be only invoked before disposing');
        });
    });

    describe('offAll', function () {

        it('should off all subscriptions', function () {
            var count = 0;

            eventManager.on(HELLO, function (value) {
                assert.strictEqual(value, 3);
            });

            eventManager.observe(HELLO).
                subscribe(function (value) {
                    assert.strictEqual(value, 3);
                });

            eventManager.fire(HELLO, 3);

            eventManager.on(WORLD, function (value) {
                assert.strictEqual(value, 4);
            });

            eventManager.observe(WORLD).
                subscribe(function (value) {
                    assert.strictEqual(value, 4);
                });

            eventManager.fire(WORLD, 4);

            eventManager.offAll();

            // all subscriptions should be off-ed
            eventManager.fire(HELLO, undefined);
            eventManager.fire(WORLD, undefined);
        });

        it('should off all subscriptions', function () {

            var events = 'abcdefghijklmnopqrstuvwxyz'.split('');

            events.forEach(function (event) {

                eventManager.on(event, function (value) {
                    assert.strictEqual(value, 0);
                });

                eventManager.observe(event, function (value) {
                    assert.strictEqual(value, 0);
                });
            });

            events.forEach(function (event) {
                eventManager.fire(event, 0);
            });

            eventManager.offAll();

            events.forEach(function (event) {
                eventManager.fire(event, undefined);
            });
        });
    });

    afterEach(function () {
        eventManager.offAll();
    });
});
