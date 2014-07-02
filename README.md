# [![Build Status](https://secure.travis-ci.org/huang47/rx-event-manager.png?branch=master)](http://travis-ci.org/huang47/rx-event-manager)

# Rx Event Manager

## motivation

To allow inter-modules communication in Rx way. Also, it memorize `Rx.Disposable` instances while using `on`, `once`, and `observe` where we can simply call `dispose` without explicitly stored returned subscription from aforementioned methods.

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
