---
layout: post
title: "async & await at the edge with ReactPHP"
date: 2021-12-14 13:37dw
comments: true
categories:
- PHP
- ReactPHP
tags:
- 8.1
- Fibers
- PHP
- Async
- Await
social:
  image_relative: /images/posts/php-8.1-fibers.jpg
---

PHP 8.1 is out and the hip new feature for non-blocking and asynchronous programming in PHP are fibers. In this post
we're going to explore them and see how we at ReactPHP will start with them at the edge.

![PHP 8.1 fibers (green threads)](/images/posts/php-8.1-fibers.jpg)
(Photo by Dids from Pexels)[https://www.pexels.com/photo/green-plaid-fabric-on-sand-near-sea-4949969/]

<!-- More -->

Fibers are also known as green threads and offer thread like functionality within the same process, also known as
cooperative multitasking. Each process always starts with the main fiber and you can decide to spawn more.

# async

The `async()` function is the way to "spawn" a new fiber and execute code in it. Once that happens you now have two
fibers. But still only one can run at any give time. Which is why the fiber implementation lets you suspend and resume
fibers. (This is something we abstracted away from you because the API is not persé the nicest for the average user.)

THe following code will launch a new fiber:

```php
async(function () {
    // ...code comes here later...
});
```

# await

Await lets you suspend the fiber your code currently runs in. A fiber can only be resumed once, and cannot be resumed
again unless it has been started again. So the following, only with the main fiber, will not work:

```php
$browser = new \React\Http\Browser();
$valueA = await($browser->get('https://blog.wyrihaximus.net/'));
$valueB = await($browser->get('https://wyrihaximus.net/'));
$valueC = await($browser->get('https://github.com/wyrihaximus/'));
```

However, if you wrap it in a fiber, it will:

```php
async(function () {
    $browser = new \React\Http\Browser();
    $valueA = await($browser->get('https://blog.wyrihaximus.net/'));
    $valueB = await($browser->get('https://wyrihaximus.net/'));
    $valueC = await($browser->get('https://github.com/wyrihaximus/'));
});
```

The code above will make request by request, one at a time, and while waiting for that request to finish suspend that
fiber. The main fiber will then have the loop running and taking care of these requests. This is another good reason
not to suspend in the main thread: Reserve it for the event loop and other low level packages.

# Do

## Run your entire application in one

Fibers get their strength from their numbers. So if you boot your application already in a fiber that gives you a 
head start and be ready for any `await()` calls, and will leave the main fiber for the event loop.

```php
<?php

use function React\Async\async;

require_once __DIR__ . '/vendor/autoload.php';

async(function () {
    (new App())->boot();
});
```

## Request Handler

If you decide not to run your entire application in a fiber the next best way to use them are with anything that reacts to 
something external like request handlers.

```php
<?php

use Psr\Http\Message\ResponseInterface;use Psr\Http\Message\ServerRequestInterface;
use React\Http\HttpServer;
use React\Http\Message\Response;
use React\Socket\SocketServer;
use React\Promise\PromiseInterface;
use function React\Async\async;
use function React\Async\await;

require_once __DIR__ . '/vendor/autoload.php';

$http = new HttpServer(static fn (ServerRequestInterface $request): PromiseInterface => async(
    static fn (ServerRequestInterface $request): ResponseInterface => new Response(
      200,
      array(
          'Content-Type' => 'text/plain'
      ),
      await($someExternalNonBlockingPromiseReturningService)
  )
);

$socket = new SocketServer('127.0.0.1:8080');
$http->listen($socket);

echo "Server running at http://127.0.0.1:8080" . PHP_EOL;
```

# Don't

## Use async without await

There is no long explanation for this one: There is simply no use.

```php
<?php

use React\Promise\PromiseInterface;

use function React\Async\async;
use function React\Async\await;

require_once __DIR__ . '/vendor/autoload.php';

function test(): PromiseInterface {
    return async(function (): bool {
      return true;
    });
}

await(test());
```

> (Based on a code snippet posted by [`Bart Vanhoutte`](https://github.com/bartvanhoutte) on [`react/async#16`](https://github.com/reactphp/async/issues/16#issuecomment-989829770).)

If you do this, a fiber will be started, it will run, and it will finish, it will not suspend, it will not wait for
another fiber to finish while suspended. It's an expensive closure, nothing more, nothing less.

## Use await in the main fiber / Use await without async

While this technically works, it only works once. If there is another `await` within the function you called, it will
fail, for example:

```php
<?php

use React\Promise\Promise;
use React\Promise\PromiseInterface;

use function React\Async\await;
use function React\Promise\resolve;

require_once __DIR__ . '/vendor/autoload.php';

function test(): PromiseInterface {
    $resolver = function ($resolve, $reject) {
      await(resolve());

      $resolve();
    };

    return new Promise($resolver);
}

await(test());
```

> (Posted by [`Bart Vanhoutte`](https://github.com/bartvanhoutte) on [`react/async#16`](https://github.com/reactphp/async/issues/16#issuecomment-989783173).)

A solution to this would be to wrap the second `await` in an `async`:

```php
<?php

use React\Promise\PromiseInterface;

use function React\Async\async;
use function React\Async\await;
use function React\Promise\resolve;

require_once __DIR__ . '/vendor/autoload.php';

function test(): PromiseInterface {
    return async(function () {
      await(resolve());
    });
}

await(test());
```

> (Posted by [`Bart Vanhoutte`](https://github.com/bartvanhoutte) on [`react/async#16`](https://github.com/reactphp/async/issues/16#issuecomment-989829770).)

These are synthetic examples, but they demonstrate the problem well.

# Conclusion

Fibers are awesome, but because we barely scratched the surface we, ReactPHP, will start using them at the edge only.
Personally I'm working hard to get it in production on a project that's a GitHub App, and gets a webhook call for each
push, PR, and workflow start, finish, and error.
