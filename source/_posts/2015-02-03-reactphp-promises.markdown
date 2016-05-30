---
layout: post
title: "ReactPHP: Promises"
date: 2015-02-03 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Promises
- PHP
---

Promises, also known as futures, represent a value that will resolve in the future. In this post we'll tell you about promises, deferreds and useful functions when dealing with sets of promises. 

<!-- More -->

##### Installation #####

Promises don't come with and also don't need the `event-loop`. They come in a separate package and can be used outside async environments:

```sh
composer require react/promise
```

##### Deferred #####

A deferred represents an operation that has yet to complete it's unit of work. (For example a `DNS` query to lookup an IP address for a hostname. Or connecting to a remote service.) It has three state controlling methods:

- `resolve` When an operation succeeds.
- `reject` When it fails.
- `notify` Progress updates (`progress` before `v2.2`).

##### Promises #####

A promise represents the value of the deferred operation whether it has completed its unit of work or not. Thus the promise acts as a placeholder for the deferred results. Calling `Deferred::promise()` will get you the promise you return to the calling party. Promises expose several public methods but `then` is the simplest. It accepts 3 functions as arguments, all optional. (There are more on [extended](https://github.com/reactphp/promise#extendedpromiseinterface) and [cancellable](https://github.com/reactphp/promise#cancellablepromiseinterface) promises.)

```php
$promise->then(
	function () { // Success callback },
	function () { // Failure callback },
	function () { // Progress callback },
);
```

##### Enhanced timer example #####

Remember the counter from the [timers post](/2015/01/reactphp-timers/)? Lets add some promise magic to it. First we create a `Deferred` instance that represents the unit of work (`$i` to search `66`):

```php
$deferred = new \React\Promise\Deferred();
```

Sneaking in a `notify` call in the timer so we know how far in we are:

```php
$deferred->notify($i++);
```

We  also have to `resolve` once we're done and after we cancelled the timer:

```php
$deferred->resolve();
```

The timer is set up we just have to 'listen' on the deferred results. We start off by getting the promise from the deferred and call the `then` method with two callbacks. We'll just ignore the failure callback by passing `null` into its argument slot.

```php
$deferred->promise()->then(function($i) {
	echo 'Done!', PHP_EOL;
}, null, function($i) {
	echo $i, PHP_EOL;
});
```

As you can see the first callback just echo's `Done!` as it didn't receive an value in it's first argument. The second callback is the `notify` callback and it did get an argument passed. We'll just echo that to show our progress.

That gives us this bit of code:

```php
<?php

require 'vendor/autoload.php';

$i = 0;
$loop = \React\EventLoop\Factory::create();
$deferred = new \React\Promise\Deferred();

$timer = $loop->addPeriodicTimer(0.01, function(\React\EventLoop\Timer\Timer $timer) use (&$i, $deferred) {
	$deferred->notify($i++);
	if ($i >= 66) {
		$timer->cancel();
		$deferred->resolve();
	}
});

$deferred->promise()->then(function($i) {
	echo 'Done!', PHP_EOL;
}, null, function($i) {
	echo $i, PHP_EOL;
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/14804.js" id="asciicast-14804" async	></script>


##### react/dns #####

Lets a look at a more advanced example. The DNS package, `react/dns`, is an excellent example how promises can be utilized. First we need to install it:

```sh
composer require react/dns
```

([`react/dns`](https://github.com/reactphp/dns) provides async [`DNS`](http://en.wikipedia.org/wiki/Domain_Name_System) resolution for `react/http-client` and others who need it.)

Lets start by creating a resolver we can use to resolve hostnames, we'll use Google's DNS server for it (`8.8.8.8`) in this example:

```php
$dns = (new React\Dns\Resolver\Factory())->create('8.8.8.8', $loop);
```

We use `$dns` in a foreach loop with a bunch of hostnames and call the resolve each time passing the hostname and a callback:

```php
$promises[] = $dns->resolve($hostname)->then(
	function($ip) use ($hostname) {
		echo 'The IP address for ' . $hostname . ' is: ' . $ip, PHP_EOL;
		return $hostname;
	}
);
```

As you might notice the callback returns the contents of the `$hostname` after echoing a line. By returning a value (or a promise) in a callback you pass that value on into the next promise in the chain. `\React\Promise\all` accepts an array of promises and resolves once all the passed promises resolve the resulting values are then pass into the success callback of the returned promise. (You'll find more functions [here](https://github.com/reactphp/promise#functions).) Since we returned a string on each `DNS` resolved callback we can just implode the array to echo it:

```php
\React\Promise\all($promises)->then(function($hostnames) {
	echo 'Done: ' . implode(', ', $hostnames) . '!', PHP_EOL;
});
```

The resulting code:

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();
$dns = (new React\Dns\Resolver\Factory())->create('8.8.8.8', $loop);
$promises = [];

foreach([
	'example.com',
	'blog.wyrihaximus.net',
	'wyrihaximus.net',
] as $host) {
	$hostname = $host;
	$promises[] = $dns->resolve($hostname)->then(
		function($ip) use ($hostname) {
			echo 'The IP address for ' . $hostname . ' is: ' . $ip, PHP_EOL;
			return $hostname;
		}
	);
}

\React\Promise\all($promises)->then(function($hostnames) {
	echo 'Done: ' . implode(', ', $hostnames) . '~', PHP_EOL;
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/15954.js" id="asciicast-15954" async></script>

Promise [chaining](https://github.com/reactphp/promise#how-promise-forwarding-works) as shown above is a great way of keeping control over your program while running it async. The output of the example also shows react's async nature. Not all domains where resolved in the same order as they where requested.

##### Community examples #####

Lets take a look at this weeks community examples [`guzzlehttp/guzzle`](https://github.com/guzzle/guzzle/) and [`zikarsky/react-gearman`](https://github.com/bzikarsky/react-gearman). Both use promises to communicate when a task has been completed, whether it's a connection that has been made or a request that received a response. 

##### Guzzle 5.0 #####

[Since 5.0 Guzzle](http://mtdowling.com/blog/2014/10/13/guzzle-5/) supports promises out of the box. This makes it possible to use Guzzle for both sync and async code. As you can see below making the request async is simply passing the future flag into it. (Internally it will use the `CurlMultiHandler` when `ext-curl` is installed on the system. So even without [a react handler](https://github.com/WyriHaximus/ReactGuzzleRing) you can make async requests with Guzzle, it just won't integrate with the `event-loop`.)

```php
<?php

use GuzzleHttp\Client;
use GuzzleHttp\Message\Response;

(new Client())->get('https://blog.wyrihaximus.net/atom.xml', [
    'future' => true,
])->then(function(Response $response) { // Success callback
    echo $response->getBody()->getContents(), PHP_EOL;
}, function(Exception $error) { // Error callback
    echo $error->getMessage(), PHP_EOL;
});
```

##### zikarsky/react-gearman #####

`zikarsky/react-gearman` uses promises for connections. This is a commonly used pattern among react powered packages dealing with connections. Aside from making it easy to use and see what is going on it also makes it very easy to chain promises together and make connection pools.

```php
<?php

use Zikarsky\React\Gearman\WorkerInterface;
use Zikarsky\React\Gearman\Factory;

$factory = new Factory();
$factory->createWorker('127.0.0.1', 4730)->then(
	function (WorkerInterface $worker) {
		// Connection successful run worker code
	},
	// error-handler
	function($error) {
		echo "Error: $error\n";
	}
);
$factory->getEventLoop()->run();
```

[`Simplified example from package examples.`](https://github.com/bzikarsky/react-gearman/blob/master/examples/simple/async-worker.php)

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/promises)

##### Conclusion #####

Promises are a good way to keep you're code from turning into a bowl of spaghetti compared to callbacks. Chaining them enables you to create very powerful systems without losing overview. The examples in this post are just a glimpse of what you can make with them.

##### P.S. #####

This weeks article might look short. I've split this post in two and will post the second half in a few weeks once we've had more advanced topics. This keeps the learning curve doable for developers new to ReactPHP. 
