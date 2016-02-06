---
layout: post
title: "ReactPHP: Timers"
date: 2015-01-27 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Timers
- PHP
social:
  image_relative: /images/posts/ksenia-solo-lost-girl-kenzi.gif
---

One of ReactPHP's simplest feature is timers. They are a core functionality exposed by the `event-loop`. Timers are an incredible powerful yet simple feature that can get you into trouble if you don't watch out. During this post we'll look at all different kind of interactions you can do with timers.

![Tick tack tick tack](/images/posts/ksenia-solo-lost-girl-kenzi.gif)

<!-- More -->

##### Installation #####

Since timers are part of the [`event-loop`](/2015/02/reactphp-event-loop/) installing them is as simple as installing the `event-loop`. (Don't worry we're not going to dive into the details of the [`event-loop`](/2015/02/reactphp-event-loop/) in this post, that post comes when we've gone over all the [`event-loop`](/2015/02/reactphp-event-loop/) features.) We're only use timers for now.

```sh
composer require react/event-loop
```

At the beginning of each example you'll notice:
 
```php
$loop = React\EventLoop\Factory::create();
```

That is a shortcut for creating the best available `event-loop`. And at the end you'll notice:
 
```php
$loop->run();
```

That runs the `event-loop`. All code before that is just setting it up, actually execution will start then.

##### Methods #####

The [`event-loop`](/2015/02/reactphp-event-loop/) exposes the following methods for creating and interacting with timers:

* addTimer         - one-off timer (setTimeout in JavaScript)
* addPeriodicTimer - timer at a set interval (setInterval in JavaScript)
* cancelTimer      - stops a running timer be (clearTimeout/clearInterval in JavaScript)
* isTimerActive    - check whether the timer is still active or not

##### A simple timer #####

Lets start with a simple increment example:

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$i = 0;
$loop->addPeriodicTimer(1, function() use (&$i) {
	echo ++$i, PHP_EOL;
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/15552.js" id="asciicast-15552" async></script>

Looks pretty simple right. We've set up the `event-loop`, attach a `timer` to it and started the `event-loop`. Then every second it will increment and echo `$i`.

##### Keeping control over your timer #####

Now the example above will run indefinitely until you kill it. We prefer control over the tools we create. Otherwise they will turn into time bombs. So we’re adding a check that cancels the timer once `$i` equals 15. First we need the `Timer` instance, which is passed into our closure by default.

```php
$loop->addPeriodicTimer(1, function(React\EventLoop\Timer\Timer $timer) use (&$i, $loop) {
```

Secondly we check each time if `$i` equals 15 or more and cancel the `timer` if it has. We add the following to our closure body after the echo:

```php
if ($i >= 15) {
	$loop->cancelTimer($timer);
}
```

Ending up with this bit of code:

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$i = 0;
$loop->addPeriodicTimer(1, function(React\EventLoop\Timer\Timer $timer) use (&$i, $loop) {
	echo ++$i, PHP_EOL;

	if ($i >= 15) {
		$loop->cancelTimer($timer);
	}
});

$loop->run();
```

Running this the program will output 1 to 15 and then cancel the timer. The [`event-loop`](/2015/02/reactphp-event-loop/) has nothing to do from that point on and stops.

<script type="text/javascript" src="https://asciinema.org/a/15553.js" id="asciicast-15553" async></script>

##### Using a timer to stop another timer #####

The above works fine but isn't really flexible. In the next example we use a secondary timer to stop it after +/- 15 seconds. This is really handy if you want to set a timeout on something. (The community examples use this method.)

Consider the following example. It stores the first timer in `$timer` and has a secondary timer that uses `$timer` to cancel the first timer.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$i = 0;
$timer = $loop->addPeriodicTimer(1, function() use (&$i) {
	echo ++$i, PHP_EOL;
});

$loop->addTimer(15, function () use ($timer, $loop) {
	$loop->cancelTimer($timer);
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/15716.js" id="asciicast-15716" async></script>

##### Checking a timer #####

There are times when you don't know if a timer should be active or not. As mentioned at the beginning of the post there is a method to do that. It's rather simple to use, just pass a timer into it to find out if it's active or not: `$loop->isTimerActive($timer)`. 

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$i = 0;
$timer = $loop->addTimer(1, function() {
    echo 'Timer done', PHP_EOL;
});

$loop->addTimer(3, function () use ($timer, $loop) {
    if ($loop->isTimerActive($timer)) {
        echo 'Timer active', PHP_EOL;
    } else {
        echo 'Timer inactive', PHP_EOL;
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/15766.js" id="asciicast-15766" async></script>

##### Blocking #####

Beware that timers are not exact and accuracy varies. The reason for this is that the [`event-loop`](/2015/02/reactphp-event-loop/) also has others thing to do and those might block the timer execution for a few milliseconds or more depending on the loop load. (We'll take a closer look at how the [`event-loop`](/2015/02/reactphp-event-loop/) exactly works in a later post. Keeping it simple for now.) The example below shows what happens if we block the [`event-loop`](/2015/02/reactphp-event-loop/) hard with sleep.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$i = 0;
$loop->addPeriodicTimer(1, function() use (&$i) {
	echo ++$i, PHP_EOL;
});

$loop->addTimer(10, function () {
	sleep(3);
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/15732.js" id="asciicast-15732" async></script>

##### Community examples #####

Lets take a look at this weeks community examples [`predis/predis-async`](https://github.com/nrk/predis-async/) and [`wyrihaximus/react-guzzle-ring`](https://github.com/WyriHaximus/ReactGuzzleRing). Both use timers to setup connection and/or request timeouts.

##### predis/predis-async #####

`predis/predis-async` is the asynchronous [Redis](http://redis.io/) client version of [Predis](https://github.com/nrk/predis). It uses a timer to handle connection timeouts. Internally [it sets a timer when connecting to the redis server](https://github.com/nrk/predis-async/blob/c35306a815ef440f089fc059c6a384b75c6242b4/src/Connection/AbstractConnection.php#L157-L159). When the connecting fails [the internal state is reset and an exception is passed to the user](https://github.com/nrk/predis-async/blob/c35306a815ef440f089fc059c6a384b75c6242b4/src/Connection/AbstractConnection.php#L175-L176). In normal circumstances the connection will be successful and [the timer is cancelled](https://github.com/nrk/predis-async/blob/c35306a815ef440f089fc059c6a384b75c6242b4/src/Connection/AbstractConnection.php#L266).

From a users perspective you just connect to a `Redis` server, the connection timeout is handled for you. Without that timeout you would never been notified about the fact you're still trying to connect. This leads to memory leaks and process instabilities etc etc.

```php
<?php

require 'vendor/autoload.php';
$loop = React\EventLoop\Factory::create();

$client = new Predis\Async\Client('tcp://127.0.0.1:6379', $loop);
$client->connect(function ($client) {
    echo "Connected to Redis, now listening for incoming messages...\n";
});

$loop->run();
```

##### wyrihaximus/react-guzzle-ring #####

`wyrihaximus/react-guzzle-ring` is a [RingPHP](http://ringphp.readthedocs.org/) handler for [Guzzle v5](http://guzzle.readthedocs.org/). Built upon `react/http-client` it provides an asynchronous handler that lets the user use the performance of react with the power of Guzzle. Just as `predis/predis-async` it uses a timer in a similar fashion to detect and handle connection timeouts.

Consider the following [example](https://github.com/WyriHaximus/ReactGuzzleRing/blob/master/examples/timeout.php). It sets up a request to `amazon.com` and sets the request timeout at `0.001` second. Now amazon has some mighty powerful hardware but it is highly unlikely they can send a response body back in `0.001` second.

```php
<?php

require 'vendor/autoload.php';

use GuzzleHttp\Client;
use React\EventLoop\Factory;
use WyriHaximus\React\RingPHP\HttpClientAdapter;

$loop = Factory::create();

$guzzle = new Client([
    'handler' => new HttpClientAdapter($loop),
]);

$guzzle->get('http://www.amazon.com/', [
    'timeout' => 0.001,
    'future' => true,
])->then(function() {
    echo 'Amazon completed' . PHP_EOL;
}, function(exception $error) {
    echo 'Amazon error' . PHP_EOL;
    echo $error->getMessage() . PHP_EOL;
});


$loop->run();
```

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/timers)

##### Conclusion #####

Timers are a really simple but neat piece of ReactPHP that lets you keep an eye on your code. Despite the simplicity it's rather powerful and useful when dealing with connections and other timer sensitive code.
