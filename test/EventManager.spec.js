// Node.js modules
var A = require('assert');
var Rx = require('rx');

var EM = require('../lib/EventManager');
var HELLO = 'event.hello';
var WORLD = 'event.world';

describe('EventManager', function() {

    describe('observe', function() {

        it('should throw error if given event is not a valid string', function() {

            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.observe(''); });
            });
        });

        it('should return an Rx.Observable instance', function() {
            A.ok(EM.observe(HELLO) instanceof Rx.Observable);
        });

        it('should execute callback when event got fired', function(done) {
            var max = 10,
                count = 0;

            EM.observe(HELLO).take(max).subscribe(
                function (data) {
                    count++;
                    A.strictEqual('world', data.hello);
                },
                function (ex) {},
                function () {
                    A.strictEqual(count, max);
                    done();
                }
            );

            for (var i = 0; i < max; i++) {
                EM.fire(HELLO, { hello: 'world' });
            }
        });

        // for some reason onError / onCompleted logic never got executed
        it('should never throw exceptions', function (done) {

            EM.observe(HELLO).
                subscribe(
                    function () { throw new Error("..."); },
                    function () { },
                    function () { }
                );

            EM.fire(HELLO);

            done();
        });
    });

    describe('fire', function() {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.fire(invalidInput); });
            });
        });

        it('should be chainable', function() {
            A.strictEqual(EM.fire(HELLO).fire(WORLD), EM, 'fire should be chainable');
        });

        it('should fire event with given context', function(done) {

            EM.on(HELLO, function (data) {
                A.strictEqual('world', data.hello, 'data.hello should be `world`');
            });

            EM.fire(HELLO, { hello: 'world' });

            done();
        });
    });

    describe('on', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.on(invalidInput); });
            });
        });

        it('should return an Rx.Observer instance which can do dispose', function() {
            var observer = EM.on(HELLO);

            A.ok(observer instanceof Rx.Observer);
            A.strictEqual(typeof observer.dispose, 'function', 'observer.dispose should be a function');
        });
    });

    describe('once', function() {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.once(invalidInput); });
            });
        });

        it('should return an Rx.Observer instance', function() {
            var observer = EM.once(HELLO);

            A.ok(observer instanceof Rx.Observer);
            A.strictEqual(typeof observer.dispose, 'function', 'observer.dispose should be a function');
        });

        it('should execute callback only once', function(done) {
            var count = 0;

            EM.once(HELLO,
                function (data) { count++; },
                function (ex) { },
                function () {
                    A.strictEqual(1, count);
                    done();
                }
            );

            for (var i = 0; i < 10; i++) { EM.fire(HELLO); }
        });
    });

    describe('latest', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.latest(invalidInput); });
            });
        });

        it('should return an Rx.Observable instance without given onNext/onError/onCompleted', function() {
            A.ok(EM.latest(HELLO) instanceof Rx.Observable);
        });

        it('should return an Rx.Observable instance without given onNext/onError/onCompleted', function() {
            A.ok(EM.latest(HELLO) instanceof Rx.Observable);
        });

        it('should return an Rx.Observer instance with given onNext', function() {

            var subscription = EM.latest(HELLO, function () {});

            A.ok(subscription instanceof Rx.Observer);
            A.strictEqual(typeof subscription.dispose, 'function', 'subscription.dispose should be a function');
        });

        it('should replay latest (1) value', function (done) {
            var count = 0,
                expect = 42;

            EM.fire(HELLO, expect);

            EM.latest(HELLO, function (value) {
                A.strictEqual(value, expect, 'should be invoked immediate with value ' + expect);
                done();
            });
        });

        it('should replay latest (1) value - crazy example', function (done) {
            var count = 0;

            for (; count < 100; count++) {
                EM.fire(HELLO, count);
            }

            expect = count - 1;

            EM.latest(HELLO, function (value) {
                A.strictEqual(value, expect, 'should be invoked immediate with value ' + expect);
                done();
            });
        });

        it('should not replay if it is already disposed', function (done) {
            var expect = 42;
            
            EM.fire(HELLO, 'whatever');

            EM.dispose(HELLO);

            EM.latest(HELLO, function (value) {
                A.strictEqual(value, expect);
                done();
            });

            EM.fire(HELLO, expect);
        });
    });

    describe('change', function () {

        it('should throw error if given event is not a valid string', function() {
            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.change(invalidInput); });
            });
        });

        it('should throw error if given event is not a function', function() {
            A.throws(function () { EM.change(HELLO, {}); });
            A.throws(function () { EM.change(HELLO, []); });
        });

        it('should return an Rx.Observable instance without given onNext/onError/onCompleted', function() {
            A.ok(EM.change(HELLO) instanceof Rx.Observable);
            A.ok(EM.change(HELLO, function (x, y) { return x === y; }) instanceof Rx.Observable);
        });

        it('should return an Rx.Observable instance without given onNext/onError/onCompleted', function() {
            A.ok(EM.change(HELLO) instanceof Rx.Observable);
        });

        it('should return an Rx.Observer instance with given onNext', function() {

            var subscription = EM.change(HELLO, function (x, y) { return x === y;}, function () {});

            A.ok(subscription instanceof Rx.Observer);
            A.strictEqual(typeof subscription.dispose, 'function', 'subscription.dispose should be a function');
        });
        
        it('should fire event only if data is changed', function () {
            var expect = 42,
                count = 0;

            EM.change(HELLO).
                subscribe(function (value) {
                    A.strictEqual(value, expect);
                    A.strictEqual(0, count);
                });

            EM.fire(HELLO, expect);

            count += 1;

            // should not trigger subscribe
            EM.fire(HELLO, expect);
        });

        it('should be capable of customizing comparer', function () {
            var expect = 42,
                count = 0;
                
            function comparer(x, y) { return x.value === y.value; }

            EM.change(HELLO, comparer).
                subscribe(function (data) {
                    A.strictEqual(data.value, expect);
                    A.strictEqual(0, count);
                });

            EM.fire(HELLO, { value: expect });

            count += 1;

            // should not trigger subscribe
            EM.fire(HELLO, { value: expect });
        });
    });

    describe('use-case', function () {

        it('should emit sequences only for latest subscriptions while using observe/on and latest', function (done) {
            var expect = 42;

            EM.fire(HELLO, expect);

            EM.observe(HELLO).
                subscribe(function () {
                    A.fail('observe should be never invoked');
                });

            EM.on(HELLO, function () {
                A.fail('on should be never invoked');
            });

            EM.latest(HELLO, function (value) {
                A.strictEqual(value, expect);
                done();
            });
        });
    });

    describe('dispose', function () {

        it('should dispose with given event via `on`', function () {
            var count = 0;

            EM.on(HELLO, function (value) {
                count += value;
            });

            EM.fire(HELLO, 1);

            EM.dispose(HELLO);

            EM.fire(HELLO, 1);

            A.strictEqual(count, 1);
        });

        it('should dispose with given event via `once`', function () {
            var count = 0;

            EM.once(HELLO, function (data) {
                count += value;
            });

            EM.dispose(HELLO);

            EM.fire(HELLO, 1);

            A.strictEqual(count, 0);
        });

        it('should dispose with given event via `observe`', function () {
            var count = 0;

            EM.observe(HELLO).subscribe(function (value) {
                count += value;
            });

            EM.fire(HELLO, 1);

            EM.dispose(HELLO);

            EM.fire(HELLO, 1);

            A.strictEqual(count, 1);
        });

        it('should dispose with given event via `observe` which has extra operators', function () {
            var count = 0,
                i;

            EM.observe(HELLO).
                filter(function (value) {
                    return value > 5;
                }).
                subscribe(function (value) {
                    count += value;
                });

            for (i = 0; i < 5; i++) {
                EM.fire(HELLO, Math.pow(2, i));
            }

            EM.dispose(HELLO);

            for (i = 0; i < 5; i++) {
                EM.fire(HELLO, Math.pow(2, i));
            }

            A.strictEqual(count, 24, 'should be sum of 8 + 16');
        });

        it('should not dispose further subscriptions', function () {
            var count = 0;

            EM.on(HELLO, function (value) {
                count += value;
            });

            EM.fire(HELLO, 1);

            EM.dispose(HELLO);

            EM.fire(HELLO, 2);

            EM.on(HELLO, function (value) {
                count += value;
            });

            EM.fire(HELLO, 4);

            A.strictEqual(count, 5, 'should be sum of 1 + 4');
        });

        it('should dispose with given event - crazy example', function () {
            var events = 'abcdefghijklmnopqrstuvwxyz'.split(''),
                count = 0;

            events.
                forEach(function (event, index) {
                    // subscribe `event`
                    EM.on(event, function (value) { count += value; });

                    // fire `event`
                    EM.fire(event, Math.pow(2, index));

                    // dispose `event`
                    EM.dispose(event);

                    // fire `event` again, if it's taking effect 
                    // count won't be a number anymore
                    EM.fire(event, undefined);
                });

            // 2^0 + 2^1 + ... + 2^25
            A.strictEqual(count, Math.pow(2, 26) - 1, 'event should be only invoked before disposing');
        });
    });

    afterEach(function () {
        EM.dispose(HELLO);
        EM.dispose(WORLD);
    });
});
