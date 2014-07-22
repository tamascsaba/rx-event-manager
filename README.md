[![Build Status](https://secure.travis-ci.org/huang47/rx-event-manager.png?branch=master)](http://travis-ci.org/huang47/rx-event-manager)
[![Coverage Status](https://img.shields.io/coveralls/huang47/rx-event-manager.svg)](https://coveralls.io/r/huang47/rx-event-manager?branch=master)
[![NPM version](http://img.shields.io/npm/v/rx-event-manager.svg)](http://img.shields.io/npm/v/rx-event-manager.svg)
[![Downloads](http://img.shields.io/npm/dm/rx-event-manager.svg)](https://npmjs.org/package/rx-event-manager)

# Rx Event Manager

## motivation

To allow inter-modules communication in Rx way. Also, it memorize `Rx.Disposable` instances where we can simply call `dispose` without explicitly stored returned subscription.

## API

### observe

return a `Rx.Observable` instance with given `event` name

#### observe given event

```js
EventManager.observe('hello').
	subscribe(function (data) {
		// data.answer === 42;
	});
	
EventManager.fire('hello', { answer: 42 })
```

### on

a shorthand of combination of `observe` and `subscribe` which returns an instance of `Rx.Observer`

#### listen to given event

```js
EventManager.on('hello', function (data) {
	// data.answer === 42;
});
	
EventManager.fire('hello', { answer: 42 });
```

### fire

dispatch event with given `event` and `data`

```js
// fire 'hello' event which which has data { answer: 42 }
EventManager.fire('hello', { answer: 42 });

// fire 'answer' event which has data `42`
EventManager.fire('answer', 42);
```

### once

listen to given `event` only once.

```js
EventManager.once('hello',
	function (data) {
		console.log(data.value);
	},
	function (ex) {
		// nada
	}.
	function () {
		console.log('complete');
	}
);
	
EventManager.fire('hello', { value: 'hello' });
> hello
> complete

EventManager.fire('hello', { value: 'world' })
// nothing happened
```

### latest

emit sequence immediately with most recent value
if given `event` got fired before.

```js
EventManager.fire('hello', 42);

EventManager.latest('hello', function onNext(value) {
	console.log('callback %s', value);
});	
> callback 42

EventManager.latest('hello').
	subscribe(function (value) {
		console.log('observable %s', value);
	});	
> observable 42

EventManager.fire('hello', 'world');
> callback world
> observable world
```

### change

emit sequences only if data changed

```js
EventManager.change('hello').
	subscribe(function (value) {
		console.log('hello %s', value);
	});

EventManager.fire('hello', 1);
> 1

EventManager.fire('hello', 1);
// nothing happened

EventManager.fire('hello', 2);
> 2
```

```js
function comparer(x, y) {
	return x.value === y.value;
}

EventManager.change('hello', comparer).
	subscribe(function (data) {
		console.log('observable %s', data.value);
	});
	
EventManager.change('hello', comparer, function (data) {
	console.log('callback %s', data.value);
});

EventManager.fire('hello', { value: 1 });
> observable 1
> callback 1

EventManager.fire('hello', { value: 1 });
// nothing happened

EventManager.fire('hello', { value: 2 });
> observable 2
> callback 2
```

### dispose

dispose and remove given `event`

```js
// get disposable instance from `on` method

EventManager.on('hello', function (data) {
	console.log(data.value);
});
	
EventManager.fire('hello', { value: 'hello' });
> hello

EventManager.dispose('hello');

EventManager.fire('hello', { value: 'world' })
// nothing happened
```

```js
// get disposable instance from `once` method

EventManager.once('hello', function (data) {
	console.log(data.value);
});

EventManager.dispose('hello');

EventManager.fire('hello', { value: 'world' })
// nothing happened
```

```js
// get disposable instance from `observe` method

EventManager.observe('hello').subscribe(function (data) {
	console.log(data.value);
});

EventManager.fire('hello', { value: 'world' })
> world

EventManager.dispose('hello');

EventManager.fire('hello', { value: 'world' })
// nothing happened
```

```js
// via `observe` method which has extra operators 

EventManager.observe('hello').
	filter(function (value) {
		return 'string' === typeof value;
	}).
	subscribe(function (data) {
		console.log(data.value);
	});

EventManager.fire('hello', { value: 42 })
//nothing happened

EventManager.fire('hello', { value: 'world' })
> world

EventManager.dispose('hello');

EventManager.fire('hello', { value: 'world' })
// nothing happened
```

### disposeAll

dispose and remove all event subscriptions

```js
EventManager.on('hello', function (data) {
	console.log(data.value);
});
	
EventManager.fire('hello', { value: 'hello' });
> hello

EventManager.disposeAll();

EventManager.fire('hello', { value: 'world' })
// nothing happened
```