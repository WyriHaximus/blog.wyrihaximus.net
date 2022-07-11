---
layout: post
title: "My road to fibers with ReactPHP"
date: 2022-07-11 13:37dw
comments: true
categories:
- PHP
- ReactPHP
tags:
- 8.1
- Fibers
- Threads
- PHP
- Async
- Await
social:
  image_relative: /images/posts/php-8.1-fibers-cancelled.jpg
---

The road to fibers didn't start for me in 2021 when the [`fibers` RFC](https://wiki.php.net/rfc/fibers) went into vote. 
Nor did it in 2019 when I started working on what would become [`React Parallel`](https://github.com/reactphp-parallel), 
a set of packages to me working with threads in [`ReactPHP`](https://reactphp.org/) quick and easy. (A goal which I managed to hit IMHO.)
It started when I joined the [`ReactPHP`](https://reactphp.org/) team to create the filesystem component and all we had where promises.

![Waved fibers into a near pattern](/images/posts/pexels-pixabay-159049.jpg)
> [Photo by Pixabay from Pexels](https://www.pexels.com/photo/blue-black-and-gold-woven-textile-159049/)

<!-- More -->

# Filesystem

When I initially joined the [`ReactPHP`](https://reactphp.org/#team) team, I started working on was the filesystem component on 
[August 27, 2014](https://github.com/reactphp/filesystem/commit/63e585d3e9cdc27e572473d39fdff405cbbca4e4). Which was 
really cool to work on, it had promises (which I was still grasping), and [`ext-eio`](https://www.php.net/manual/en/book.eio.php) 
which does async filesysten operations using threads because there simply is no non-blocking filesystem I/O.

Of course, I made the initial version to complex trying to make it perfect. (The new 0.2 that is in the works now 
doesn't have that issue.) To make that version work I've also created certain packages to spawn child processes with 
easy [RPC Like communication](https://github.com/WyriHaximus/reactphp-child-process-messenger) and 
[pool](https://github.com/WyriHaximus/reactphp-child-process-pool). All so it would also work, be it slower, on 
installations without [`ext-eio`](https://www.php.net/manual/en/book.eio.php).

At the current point in time the next generation of that package has support for [`ext-uv`](https://pecl.php.net/package/uv) 
and I gave up on Windows, so I have a fallback that uses blocking calls just for the sake of supporting Windows, and 
I'm not proud of it.

# Promises

At the core of [`ReactPHP`](https://reactphp.org/) are [promises](https://reactphp.org/promise/), and for those who do not know what they are. 
[Promises](https://reactphp.org/promise/) are a representation in object form that represent the possible future outcome of a I/O operation. So the 
following synchronous code:

```php
try {
    $fileContents = readFileContents();
} catch (\Throwable $throwable) {
    echo (string)$throwable;
}

// Do things with the file contents here
```

Is written with promises like as:

```php
readFileContents()->then(static function (string $filContents) {
    // Do things with the file contents here
}, static function (\Throwable $throwable) {
    echo (string)$throwable;
})
```

And this works very well, and for me is simple. However, it took me 2 -3 years to fully wrap my head around a while 
bunch of details. And still, reading through the code working on adding type annotations, it holds a surprise here and 
there for me.

# Recoil and Generators

Early attempts to utilize generators in PHP 5.6 to make dealing with promises easier yielded [`RecoilPHP`](https://github.com/recoilphp/recoil) and [`AmPHP`](https://amphp.org/). [`AmPHP`](https://amphp.org/) is 
another project bringing event loop based projects to PHP, but with a slightly different philosophy than [`ReactPHP`](https://reactphp.org/), where 
ReactPHP does non-blocking PHP; [`AmPHP`](https://amphp.org/) does async PHP. [`RecoilPHP`](https://github.com/recoilphp/recoil) on the other hand only does generator based 
[coroutines](https://www.npopov.com/2012/12/22/Cooperative-multitasking-using-coroutines-in-PHP.html), and can hook 
into [`ReactPHP`](https://reactphp.org/).

So that promise example from the previous section suddenly becomes:

```php
ReactKernel::start(function () {
  try {
      $fileContents = yield readFileContents();
  } catch (\Throwable $throwable) {
      echo (string)$throwable;
  }
  
  // Do things with the file contents here
});
```

And this is awesome from a developers experience, except for a few gotchas.

a) It is either generators at the edge, or all the way where you have to support them between the edge, and every 
function down till the one that yields for doing the I/O. While this works, and it IMHO a PITA if your project is 
non-blocking and not async by design, I still consider this a hack because it is an all or nothing situation. It does 
however work for AmPHP.

b) It requires the yield keyword everywhere, which is mainly a visual meh.

c) Every return type hint will be `Generator` regardless of what that function or method returns.

# Threads with ext-parallel

When [Joe Watkins](https://twitter.com/krakjoe), the author of [` [`ext-pthreads`](https://www.php.net/manual/en/pthreads.installation.php) `](https://www.php.net/manual/en/pthreads.installation.php), came with [`ext-parallel`](https://www.php.net/manual/en/book.parallel.php) as te spiritual successor of  [`ext-pthreads`](https://www.php.net/manual/en/pthreads.installation.php) . I was 
excited because it means you can now do threading in PHP without all the messy overhead ` [`ext-pthreads`](https://www.php.net/manual/en/pthreads.installation.php) ` required to 
managed your threads. The following code is enough to start a new thread:

```php
parallel\run(function () {
    echo 'Hello from a thread!', PHP_EOL;
});
```

Which is amazingly simple, and when you added `sleep()` calls it only blocks one thread.

# Initial experiments

Excited by the initial results of some playing around with it, I decided to try it out on [`WyriMaps.net`](https://www.wyrimaps.net/), and 
specifically it's static map generator service. This service is a clone of Google's static map image generator service 
and takes a set of coordinates, map name (tileset), a width and height of the expected resulting image, and a zoom 
level. Based on that it generates an image. Now this might sound very straightforward, and it is, except it's every 
CPU intensive and will block the current [`ReactPHP`](https://reactphp.org/) server if you run it in a single process.

So I started experimenting with running the image generation inside a thread using [`ext-parallel`](https://www.php.net/manual/en/book.parallel.php). And it worked 
perfectly, except there was one drawback. The code was running on a single core CPU VPS at [`DigitalOcean`](https://m.do.co/c/7493728c79e4). So while 
multithreading is awesome and won't block your event loop, CPU saturation still grinds it to a halt. Plus this service 
was behind a CloudFront distribution that keeps the connection alive until the request is completed. It meant that the 
service kept a backlog and continued processing every request that came in.

The queue/backlog graph for that was this:

[![The queue/backlog graph for that was this](/images/posts/parallel-queue-backlog-graph.jpeg)](https://twitter.com/WyriHaximus/status/1174661128804347904)

# Building my own Docker images

There was one issue with using [`ext-parallel`](https://www.php.net/manual/en/book.parallel.php), and that is that it requires the Zend Thread Safe edition of PHP, or 
ZTS. Most PHP applications use the Non-thread Safe edition of PHP, or NTS. This became one of the catalysts to migrate 
my projects to Docker (with supervisor). Because, getting ZTS PHP installed directly on Linux is a bit trickier than 
just apt-getting PHP without affecting other projects. And since I just joined [Usabilla](https://usabilla.com/) before that, our [PHP Docker 
images](https://github.com/usabilla/php-docker-template) was a great staring point for me to build my own. 

In time, I migrated to GitHub Actions and ended up porting those teaching back to [Usabilla](https://usabilla.com/)'s repository. That migration 
also made it possible to start building for `arm64` to use on my home Kubernetes cluster. The beauty of using 
GitHub Actions is that every single PHP version + [Alpine Linux](https://www.alpinelinux.org/) version variation is build in its own job, so there are 
20 - 40 image variations build in parallel. And while that is worth hours of execution time, real time it's a matter of 
minutes before all variants are build. (This obviously slowed down once I started building `arm64` images due to the 
CPU architecture translation step.)

One of the key aspects with I took, and put in all my Docker image building projects are tests and CVE scanning. If 
either of those fails the Docker image does not get pushed to the container registries. Those tests make sure all the 
expected extensions are installed with PHP and functioning on a basic level. The workflow also checks daily for new 
CVE's in already build and pushed images and rebuilds them. It also rebuilds the images if there is a newer upstream 
image so they are always up to date. This makes that the number of images build each morning varies but very rarely 
it builds them all.

Since all my PHP projects run on [`ReactPHP`](https://reactphp.org/) I also added ext-uv for a sublime event loop performance and several other 
extensions I needed for my projects. These Docker images have now become my defacto default for all my projects and 
Docker based GitHub Actions.

# Building React Parallel

Once the Docker images where in place work stated on what would become React Parallel, a set of packages and 
abstractions to make working with [`ext-parallel`](https://www.php.net/manual/en/book.parallel.php) and [`ReactPHP`](https://reactphp.org/) easier. Once of the key pieces was the [Future to Promise 
converter](https://github.com/reactphp-parallel/future-to-promise-converter). The following `run()` call returns a future:

```php
$future = parallel\run(static function (): int {
    return time();
});
```

For us the Future has two methods that where important, `done()` and `value()`. The converter is a naive implementation 
that registered a timer with the event loop and checked 1.000 times per second if `done()` would return true. If it 
did it would cancel the timer and resolve the promise it returned with the result from `value()` or reject it when an 
error was thrown during getting the value. For low value future conversions this as fine, but the pull methodology 
means the event loop would get (rather) busy. And using one timer for all conversion's means we'd have to check all 
futures every timer tick, which equally slows the loop down. [`ext-parallel`](https://www.php.net/manual/en/book.parallel.php) early on also introduced events, its own 
internal event loop, that can be used to only get futures which as done per tick. We'd still have a timer, but now only 
one was needed, and every time we'd call `parallel\Events::poll()`. That looks like this:

```php
while ($event = $this->events->poll()) {
    switch ($event->type) {
        case Events\Event\Type::Read:
            $this->handleReadEvent($event);
            break;
        case Events\Event\Type::Close:
            $this->handleCloseEvent($event);
            break;
        case Events\Event\Type::Cancel:
            $this->handleCancelEvent($event);
            break;
        case Events\Event\Type::Kill:
            $this->handleKillEvent($event);
            break;
        case Events\Event\Type::Error:
            $this->handleErrorEvent($event);
            break;
    }
}
```

And that is probably a lot more than you expected, but this same 
[event loop bridge](https://github.com/reactphp-parallel/event-loop/) this code resides in also handles channels used 
to send information back and forth between threads. And that is where it became fascinating for me. Because generating 
an image in a single request is one thing. Using [`ChimeraPHP`](https://github.com/chimeraphp) as HTTP framework while mixing [`react/http`](https://reactphp.org/http/) and [`PSR-15`](https://www.php-fig.org/psr/psr-15/) 
middleware and pushing things on queue's using non-blocking packages but still keeping that synchronous looking API 
is a whole different level.

# Proxying calls to objects in other threads

From the start I had the bat shit crazy idea to proxy calls from objects in one thread to them in another thread. (This 
technically is crazy enough on its own, but you also need to keep in mind that shared state is asking for trouble.) The 
more I got to the point of getting it working, the more I realized it is possible to do. There are a few catches:

* Anything transferred between threads `MUST` be scalars or userland defined objects that don't implement/extend non-userland classes/interfaces. So exceptions are a no go ([unless you encode them as `JSON`](https://github.com/WyriHaximus/php-json-throwable)).
* Sending anything between threads is slow (well relatively of course).
* When you write any code that uses this kind of functionality you `MUST` be aware that between two consecutive calls state might have changed. (Welcome to non-blocking/asynchronous programming)

So in the following code, `$redis` isn't the `LazyClient` from [`clue/redis-react`](https://github.com/clue/reactphp-redis), 
but a proxy representing it with generated methods that don't return a promise, but the outcome communicated through that promise:

```php
try {
  $value = $redis->get($key);
  var_dump($value);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
```

(Example taken [from](https://github.com/clue/reactphp-redis#client).)

When the code reaches `$redis->get()` the proxy, depending on if the method has certain annotations, will idiomatically
put the call on a channel with any pending delayed calls or delay it if it has a `@Delay` annotation. The support for
delayed calls is only used if there is a `void` return type hint and it doesn't matter if the call is delayed by up to
a tenth of a second. This is useful for metrics collection, which had about 10 calls per request vs 1 call that needed
couldn't be delayed, like querying a database. This gave a huge performance boost as the delayed calls would be
piggybacking on the message for the database query, saving a lot of time and resource syncing.

[`ext-parallel`](https://www.php.net/manual/en/book.parallel.php) features channels to allow bi-directional communication between threads. Where futures only provide one
way communication, channels, while more complicated to use, support both ways. This is also where the events system
comes in again and why I created the event loop bridge to handle all that in one place.

Once the message (bundle) reaches the main thread it then needs to figure out which object to send the call to. For
that to work every object that is proxyable most be registered, either through manual registering or by providing a
list of such objects and a PSR-11 container. It keeps a registry with proxyable objects, and their proxies so it knows
where it came from and where to send the outcome to.

All of that boils down to:

```php
try {
    $outcome = $registry->get($call->objectReference())->{$call->method()}(...$call->args());
    if ($outcome instanceof PromiseInterface) {
        $outcome->then(static function ($result) use ($call) {
            $call->channel()->send(new Outcome($result));
        }, static function (Throwable $throwable) use ($call) {
           $call->channel()->send(new Error($throwable));
       });
    } else {
        $call->channel()->send(new Outcome($outcome));
    }
} catch (Throwable $throwable) {
    $call->channel()->send(new Error($throwable)); // Encoding the throwable to JSON is done in the `Error` object for transport over the channel
}
```

(Very simplified version of [`Proxy/Handler`](https://github.com/reactphp-parallel/object-proxy/blob/master/src/Proxy/Handler.php).

To make this concept work well with countless different threads, a lot of tracking where goes what is required, hooking
into the garbage collector making sure no dead proxies are kept around, lots of encoding to and from JSON. And still I
had the service segfault about once an hour.

# Fibers

This is where my excitement for fibers comes in. While I started using threads to put computational heavy code in it, I
ended up using it as an alternative for [`RecoilPHP`](https://github.com/recoilphp/recoil) without the need generators. The API's became cleaner but there
was a massively overpowered tool required for that. Promises bring exactly that clean API I was looking for without the
overhead of using threads and having to coordinate everything.

Fibers let me do this:

```php
try {
  $value = await($redis->get($key));
  var_dump($value);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
```

Or when the Redis client would be using a fiber abstraction:

```php
try {
  $value = $redis->get($key);
  var_dump($value);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
```

# Making fibers work with ReactPHP

To make fibers work with [`ReactPHP`](https://reactphp.org/) I started with [Aaron's](https://twitter.com/_trowski)
[`ReactPHP + ext-fiber`](https://github.com/trowski/react-fiber) implementation and used it as inspiration for the
[initial implementation](https://github.com/reactphp/async/pull/15). This all in a resurrected package that will have
an `await` for PHP versions below 8.1 providing an upgrade path, and `v4` transforms that `await` from a port 
of [`clue/block-react`](https://github.com/clue/reactphp-block) for `v2` and `v3` into fully relying on fibers to 
suspend the current fiber together with `async`.

From there on we further stabilized the implementation adding many improvements such as 
[cancellation of fibers](https://github.com/reactphp/async/pull/20), 
[please well with the event loop](https://github.com/reactphp/async/pull/19), and many other 
[improvements](https://github.com/reactphp/async/milestone/3?closed=1). But maybe the most important to be able to 
keep velocity high on this was [renaming to `main` branch to `4.x`](https://github.com/reactphp/async/pull/29), 
allowing us to require it as `^4@dev` in other packages. Without having to rely on `dev-main` as that has other 
downsides.

# Converting packages to (support) fibers

Before I could consider converting projects like [`wyrihaximus.net`](https://www.wyrihaximus.net/)) over, my packages 
needed to support fibers where required.

But first, it is vital to understand that to make fibers work well, is to use them out of sight. So you don't have to 
think about them, so you can `await` whenever needed without worrying about blocking other code paths. To accomplish 
that I start adding fiber support to low level architectural packages. Such as the following two packages.

## wyrihaximus/broadcast

When working on PSR-14 with the PHP-FIG Working Group one of the things coming up was support for async event
dispatching. At the time, without fibers, that wasn't easily possible. Using generators could have been an option, but
again, that would have caused more problems than it solves. Async and await are the perfect fit for this. The
dispatcher isn't aware, all it gets is a callable that awaits a fiber internally calling the listener. The listener, by
marker contract, is aware it will be executed in a fiber and act accordingly. Meanwhile, the dispatcher waits until it's
finished before moving onto the next listener. Making it fully compliant with PSR-14 while still supporting
non-blocking operations from listeners. [`wyrihaximus/broadcast`](https://github.com/WyriHaximus/php-broadcast)

## wyrihaximus/react-cron

Scheduled tasks inside an application are very common to include from the start for me. Whether is cycling through
keys, or cleaning up old tasks, I tend to have a handful of them, or more, in each application I build. So having an in
process cron manager was a natural fit for that. With locking support in place, having multiple processes attempting to
run the same cron jobs also isn't an issue. It works the same as the PSR-14 dispatcher where any evoked code is ran
inside a fiber. [`wyrihaximus/react-cron`](https://github.com/WyriHaximus/reactphp-cron)

With 99% of entry points covered by those two packages, plus HTTP using a middleware, all my application code can now
run within fibers, and as such look like sync code. Making it a lot easier to read and write, less error prone, and
easier to get started writing async code. Seen line count reductions where the class is only half or even a third of
the original line count without fibers. All of this makes writing non-blocking code a lot more fun and easy again.
Initially promises are fine, and they still there, but application logic gets a lot more complicated the further you go.
And with fiber support in the [`ReactPHP`](https://reactphp.org/) ecosystem they just became a whole lot easier to understand what is happening in
a class.

# The roads ahead

One thing that didn't make the initial birthday release is type support through annotations. This will be added soon,
but more time is required due to Promises complex nature. The first 80% is easy and very simple. The other 320% are
hard, and might even require updates in static analyzers.

With this release out and about, I have a few packages to finish and release. [One of them](https://github.com/WyriHaximus/reactphp-awaitable-observable) lets you turn observables
into iterators, so you can  foreach over them.

```php
use Rx\Observable;
use Rx\Scheduler\ImmediateScheduler;

use function React\Async\async;
use function WyriHaximus\React\awaitObservable;

async(function () {
    $observable = Observable::fromArray(range(0, 1337), new ImmediateScheduler());

    foreach (awaitObservable($observable) as $integer) {
        echo $integer; // outputs 01234....13361337
    }
});
```
