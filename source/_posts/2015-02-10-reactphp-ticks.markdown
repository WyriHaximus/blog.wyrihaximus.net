---
layout: post
title: "ReactPHP: Ticks"
date: 2015-02-10 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Ticks
- PHP
---

The simplest feature in ReactPHP are ticks. Just as timers they are part of the `event-loop`. Ticks are often referred to as deferred callbacks. This makes them very useful to utilize the window between I/O events.

![Newton's Cradle](/images/posts/newtonscradle.gif)

<!-- More -->

##### Installation #####

Since ticks come with the [`event-loop`](/2015/02/reactphp-event-loop/) no extra package is required to install them.

##### Tick Queue #####

Each time you call `nextTick` or `futureTick` the passed callback is pushed into a [`SplQueue`](http://php.net/manual/en/class.splqueue.php). Once the [`event-loop`](/2015/02/reactphp-event-loop/) is done handling the current outstanding I/O it will start processing the tick queues. (`Note that the exact workings of an event loop differ per type of event loop. We'll go into that later this month.`)

##### Next vs. Future #####

Ticks come in two flavours: next and future. Next will continue running until all callbacks on the `SplQueue` are executed. While future will only execute the callbacks that are on the `SplQueue` when it begins to process them. This means that `next` will also execute new callbacks you push onto the queue while `future` doesn't. This makes both ticks types really useful in situations where you need to make a short but blocking call and firing a child process is a waste of resources. A short blocking call in this case would be something computing intensive like oauth.

##### A simple example #####

Lets start by demonstrating the difference between next ticks and future ticks

##### Future ticks #####

The future ticks in this example won’t block the loop and everything stops after one 10th of a second.

```php
$loop->addTimer(0.1, function () use ($loop) {
    $loop->stop();
});

function fooBar($loop) {
	return function () use ($loop) {
		echo 'a';
		$loop->futureTick(fooBar($loop));
	};
}

$loop->futureTick(fooBar($loop));
$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/14771.js" id="asciicast-14771" async></script>

##### Next Ticks #####

How ever when we use the same code but do a next tick instead it will continue running.

```php
$loop->addTimer(0.1, function () use ($loop) {
    $loop->stop();
});

function fooBar($loop) {
	return function () use ($loop) {
		echo 'a';
		$loop->nextTick(fooBar($loop));
	};
}

$loop->nextTick(fooBar($loop));
$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/14772.js" id="asciicast-14772" async></script>

And that is really all there is to ticks.

##### Community examples #####

This week's community examples [`concerto/comms`](https://github.com/usebeagle/comms/) and [`recoil/recoil`](https://github.com/recoilphp/recoil/) use ticks to defer callback execution to a more appropriate time.

##### concerto/comms #####

`usebeagle/comms` is a package providing inter-process communication over [`Unix domain sockets`](http://en.wikipedia.org/wiki/Unix_domain_socket). It uses a tick to [defer the closing of a server connection](https://github.com/usebeagle/comms/blob/840f851402438a20e1b6cc05ea64c3a2e523e27b/src/Client.php#L50-L52).

##### recoil/recoil #####

`recoil/recoil` is a [generator-based](http://php.net/manual/en/language.generators.php) cooperative multitasking kernel. Instead of exposing the promise API it utilizes generators to return values through [coroutines](https://nikic.github.io/2012/12/22/Cooperative-multitasking-using-coroutines-in-PHP.html). (Really cool stuff be sure to check it out!) Internally it uses ticks to check and process internal state after I/O has happened.

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/ticks)

##### Conclusion #####

Ticks are a simple but useful feature. Providing the possibility to defer a callback's execution until after the I/O queue has been done. That window of opportunity is for example perfect to (d)e(n)code some json, sign a request to twitter or hand the control to any other possible blocking code. But keep in mind that when you're blocking for to long you're blocking I/O.

