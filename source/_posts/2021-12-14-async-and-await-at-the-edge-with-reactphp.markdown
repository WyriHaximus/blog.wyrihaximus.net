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
> [Photo by Dids from Pexels](https://www.pexels.com/photo/green-plaid-fabric-on-sand-near-sea-4949969/)

<!-- More -->

Fibers are also known as green threads and offer thread like functionality within the same process, also known as
cooperative multitasking. Each process always starts with the main fiber and you can decide to spawn more. 

When I initially wrote this post I had a list of do's and don't based on initial feedback from `react/async` users. 
Since then I've had chats with some people that proof read the post from different angles. So I overhauled the post, 
filed a [PR](https://github.com/reactphp/async/pull/18) to `react/async`. (You can see the history
[here](https://github.com/WyriHaximus/blog.wyrihaximus.net/pull/143).)

# async

The `async()` function is the way to "spawn" a new fiber and execute code in it. Once that happens you now have two
fibers. But still only one can run at any give time. Which is why the fiber implementation lets you suspend and resume
fibers. (This is something we abstracted away from you because the API is not persé the nicest for the end user.)

The following code will launch a new fiber:

```php
async(function () {
    // ...code comes here later...
});
```

# await

Await lets you suspend the fiber your code currently runs in. While the following works, we do not recommend it:

```php
$browser = new \React\Http\Browser();
$valueA = await($browser->get('https://blog.wyrihaximus.net/'));
$valueB = await($browser->get('https://wyrihaximus.net/'));
$valueC = await($browser->get('https://github.com/wyrihaximus/'));
```

This, will keep the main fiber for the event loop, while it uses another one to requests the browser to send those
HTTP requests:

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
not to suspend in the main thread: Reserve it for the event loop and other low level packages that deal with 
connections and protocols on top of those connections.

# No more Do's and Don't's

Initially, I wrote a list of do's and don't here, but given recent insights there is a lot more possible than I
initially thought. The `Don't`'s all of the sudden became a `wouldn't recommend this, but it should work`, and the
`Do`'s became `preferences`. There are two of those I want to highlight in the next two sections.

## Run your entire application a fiber

Fibers get their strength from their numbers. So if you boot your application already in a fiber that gives you a 
head start and be ready for any `await()` calls in your app, or in 3rd party packages. Plus this will make you always
return to the main fiber where the event loop runs. For example the following code will block the main fiber for
five seconds before setting up the signal handler.

```php
use React\EventLoop\Loop;
use function React\Async\await;

require_once __DIR__ . '/vendor/autoload.php';

final class App
{
    public function boot(): void
    {
        await(sleep(5));
    }
}

(new App())->boot();

Loop::addSignal(SIGINT, function (int $signal) {
    echo 'Caught user interrupt signal' . PHP_EOL;
    die();
});
```

However, if you wrap `async()` around `(new App())->boot();`, setting up the signal handler isn't blocked for five
seconds.

```php
use React\EventLoop\Loop;
use function React\Async\async;
use function React\Async\await;

require_once __DIR__ . '/vendor/autoload.php';

final class App
{
    public function boot(): void
    {
        await(sleep(5));
    }
}

async(function () {
    (new App())->boot();
});

Loop::addSignal(SIGINT, function (int $signal) {
    echo 'Caught user interrupt signal' . PHP_EOL;
    die();
});
```

## Request Handler

Request handlers, or cron actions, or command handlers are another great place to use `async()` as your handlers
suddenly become much easier to write with an `await()` around every promise returning call. This is also a great
example or `async` and `await` at the edge. Where we want to start, before considering => researching => beta testing 
fibers deeper into ReactPHP, so we can ensure a stable and reliable API.

```php
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
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

# Looking ahead

While we start at the edge, we already discussed which API's might benefit from using fibers. The Browser example
earlier in this post could be looking like this in the future:

```php
$browser = new \React\Http\Browser();
$valueA = $browser->get('https://blog.wyrihaximus.net/');
$valueB = $browser->get('https://wyrihaximus.net/');
$valueC = $browser->get('https://github.com/wyrihaximus/');
```

While still working exactly the same as with the `await()` wrapping the `Browser::get` calls.

But there is a problem with that, currently there is no way to cancel a fiber as we can do now with promises
(`$promise->cancel()`). (In fact, there has already [an issue](https://github.com/reactphp/async/issues/17) been raised
about it.) And we simply don't know how that will play out. In certain, low level, situations like
[RFC 8305](https://datatracker.ietf.org/doc/html/rfc8305) and [RFC 6555](https://datatracker.ietf.org/doc/html/rfc6555),
you want to be able to cancel promises and continue with the first fulfilling promise.

Among the discussions we've had been topics like `Do we introduce a new API or replace the current one?`,
`How much should we care about promise cancellation?`, `What will the upgrade path be?`. And when we have the answers 
to those, will let you know.

# Conclusion

Fibers are awesome, but because we barely scratched the surface we, ReactPHP, will start using them at the edge only.
Personally I'm working hard to get it in production on a project that's a GitHub App, and gets a webhook call for each
push, PR, and workflow start, finish, and error. Initially I build 
[`react-parallel`](https://github.com/reactphp-parallel) for that, achieved the same kind of API als fibers now make 
possible, but with the overhead and all the complications of threads. Can't wait to tell more about this project, but 
only in due time when it's more stable and mature.
