// Node.js modules
var A = require('assert');
var Rx = require('rx');

var EM = require('../lib/EventManager');

describe('EventManager', function() {

    describe('observe', function() {

        it('should throw error if given event is not a valid string', function() {

            ['', 0, undefined, null, false, {}, []].forEach(function (invalidInput) {
                A.throws(function () { EM.observe(''); });
            });
        });

        it('should return an Rx.Observable instance', function() {
            A.ok(EM.observe('hello.world') instanceof Rx.Observable);
        });

        it('should execute callback when event got fired', function(done) {
            var max = 10,
                count = 0;

            EM.observe('hello.world').take(max).subscribe(
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
                EM.fire('hello.world', { hello: 'world' });
            }
        });

        // for some reason onError / onCompleted logic never got executed
        it('should never throw exceptions', function (done) {

            EM.observe('hello.world').
                subscribe(
                    function () { throw new Error("..."); },
                    function () { },
                    function () { }
                );

            EM.fire('hello.world');

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
            A.strictEqual(EM.fire('hello').fire('world'), EM, 'fire should be chainable');
        });

        it('should fire event with given context', function(done) {

            EM.on('hello.world', function (data) {
                A.strictEqual('world', data.hello, 'data.hello should be `world`');
            });

            EM.fire('hello.world', { hello: 'world' });

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
            var observer = EM.on('hello.world');

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
            var observer = EM.once('hello.world');

            A.ok(observer instanceof Rx.Observer);
            A.strictEqual(typeof observer.dispose, 'function', 'observer.dispose should be a function');
        });

        it('should execute callback only once', function(done) {
            var count = 0;

            EM.once('hello.world',
                function (data) { count++; },
                function (ex) { },
                function () {
                    A.strictEqual(1, count);
                    done();
                }
            );

            // fire 10 `hello.world` events
            for (var i = 0; i < 10; i++) { EM.fire('hello.world'); }
        });
    });

    describe('dispose', function () {

        it('should dispose with given event via `on`', function () {
            var count = 0;

            EM.on('hello', function (value) {
                count += value;
            });

            EM.fire('hello', 1);

            EM.dispose('hello');

            EM.fire('hello', 1);

            A.strictEqual(count, 1);
        });

        it('should dispose with given event via `once`', function () {
            var count = 0;

            EM.once('hello', function (data) {
                count += value;
            });

            EM.dispose('hello');

            EM.fire('hello', 1);

            A.strictEqual(count, 0);
        });

        it('should dispose with given event via `observe`', function () {
            var count = 0;

            EM.observe('hello').subscribe(function (value) {
                count += value;
            });

            EM.fire('hello', 1);

            EM.dispose('hello');

            EM.fire('hello', 1);

            A.strictEqual(count, 1);
        });

        it('should dispose with given event via `observe` which has extra operators', function () {
            var count = 0;

            EM.observe('hello').
                filter(function (value) {
                    return value > 5;
                }).
                subscribe(function (value) {
                    count += value;
                });

            for (var i = 0; i < 5; i++) {
                EM.fire('hello', Math.pow(2, i));
            }

            EM.dispose('hello');

            for (var i = 0; i < 5; i++) {
                EM.fire('hello', Math.pow(2, i));
            }

            A.strictEqual(count, 24, 'should be sum of 8 + 16');
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
});
