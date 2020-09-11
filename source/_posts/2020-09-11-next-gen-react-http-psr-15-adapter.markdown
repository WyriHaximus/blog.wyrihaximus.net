---
layout: post
title: "Building the next generation react/http PSR-15 adapter"
date: 2020-09-11 13:37dw
comments: true
categories:
- PHP
- ReactPHP
tags:
- PHP
- ReactPHP
- Threads
- PSR-15
social:
  image_relative: /images/posts/needle-4854847_640.jpg
---

[Two and a half years ago](/2018/02/reactphp-with-recoilphp-party-three-http-middleware-psr-15-adapter/) I wrote how to 
use [`RecoilPHP`](https://github.com/recoilphp/recoil) to create a PSR-15 middleware adapter for [`react/http`](https://reactphp.org/http/) 
using coroutines, monkey patching, and autoloader hijacking. Today there is a followup on that without any coroutines, 
monkey patching, and autoloader hijacking. But using [`ext-parallel`](https://github.com/krakjoe/parallel) instead, 
[`react-parallel/psr-15-adapter`](https://github.com/reactphp-parallel/psr-15-adapter) was created.

![Needle Threads Sewing Thread Eye Of A Needle](/images/posts/needle-4854847_640.jpg)

<!-- More -->

# Origins

This origin story doesn't start out with the need to build this adapter. It starts about a year ago when I was trying 
out [`ext-parallel`](https://github.com/krakjoe/parallel) with a support service for [`WyriMaps.net`](https://wyrimaps.net/) that generates static map images on demand. 
Initially it ran using Child Processes, but those are expensive to start. The alternative I turned to are threads using 
[`ext-parallel`](https://github.com/krakjoe/parallel). The downside is that they require PHP to be compiled with ZTS turned on. As such I started creating 
[my own Docker images for PHP](https://hub.docker.com/r/wyrihaximusnet/php) specifically tuned for this. The outcome of this was a huge success, threads are near 
instantly available and all those blocking CPU intensive calls. This runs very smooth, as long as you have the CPU 
capacity to handle all requests. Later on I moved this project to a serverless architecture using [`Bref`](https://bref.sh/) because of the 
CPU limitations, but it proved threads are viable in PHP. That project opened up opportunities that before were 
impossible in PHP, like the package I'll be writing about today.


# Example usage

The following example uses [`wyrihaximus/psr-15-cat`](https://github.com/WyriHaximus/php-psr-15-cat) and 
[`wyrihaximus/psr-15-cowsay`](https://github.com/WyriHaximus/php-psr-15-cowsay) to demonstrate how this works from an 
end-user perspective. (Full example can be found [here](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/34cccd016f39c5df6810e0763d608a95b47b33b1/psr-15-middleware-adapter).)

```php
<?php

use ReactParallel\Factory as ParallelFactory;

$loop = Factory::create();
$factory = new ParallelFactory($loop);
$server = new HttpServer(
    $loop,
    new ReactMiddleware(
        $factory,
        new CatMiddleware(),
        new CowsayMiddleware(),
    ),
    static fn (ServerRequestInterface $request): ResponseInterface => new Response(200),
);
```

[![asciicast](https://asciinema.org/a/MVFkbvKHQZFIMIFOp4OuU34wu.svg)](https://asciinema.org/a/MVFkbvKHQZFIMIFOp4OuU34wu)

Looks pretty simple and easy to set up right? Welll... there are a few gotcha's, first off this package uses 
[`ext-parallel`](https://github.com/krakjoe/parallel) so we're communicating with threads. And as the spiritual 
successor to `ext-pthreads`, `ext-parallel` limits what you can send to and from a thread. You can only send scalars or 
user defined classes to and from threads. Anything else, including resources, internal PHP classes, etc is not allowed 
and will cause errors.

For this package, that includes anything in the middleware instances we pass, which are cloned before passed to a child 
thread, and the requests can't have any streaming bodies or attributes that violates these rules. The request/response 
body is forced to a string body in the middleware when it goes to or from the thread.

# Internal workings

One of the coolest thing about this middleware is that there is no monkey patching needed to make PSR-15 middleware 
compatible with `react/http`. This is possible because of the channel feature in `ext-parallel`, they enable 
bidirectional communication with threads in both a blocking and non-blocking fashion. The excellent design of this 
feature makes it possible to use this in a blocking fashion in a worker thread, while the main thread 
uses it in a non-blocking fashion dealing with hundreds of threads and channels as a process manager. Because that is 
what this opens the door to: FPM implemented using `react/http` and `ext-parallel` in pure PHP (well and a C extension). 

So to make this happen we need two channels, a thread, the PSR-15 middleware you want to run, and a request to handle. 
Once all running parts are in place a request takes the following steps:

1. Request travels to worker thread
2. worker thread runs request through PSR-15 middleware
3. Request passes through middleware and is sent to the main thread again for further processing
4. Main thread comes up with a response and sends a response to the worker thread
5. Response passes back through the PSR-15 middleware
6. Response is send back to the main thread and passed back up the middleware chain

![PRS-15 middleware adapter main worker thread flow](/images/posts/psr-15-middleware-adapter-main-worker-thread-flow.png)

The following snippets use [`react-parallel`](https://github.com/reactphp-parallel) abstractions around `ext-parallel` 
to keep the cognitive impact of this post lower. They will have a link to the abstractions for this wishing to understand 
how it works under the hood. But, this post introduces new concepts for enough readers that I don't want to overwhelm 
them, and give them to opportunity to learn at their own pace.

## 1. Request travels to worker thread

So first off we need to have the channels to communicate with the worker thread, one for shipping data to, and one for 
receiving data from. There is no abstraction for creating them, so we can just do:

```php
$input  = new Channel(Channel::Infinite);
$output = new Channel(Channel::Infinite);
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/ReactMiddleware.php#L43-L44).


Now next we need to create a worker thread, or better, use a pool with a TTL on it that will keep idle worker threads 
around for a set amount of time, so we can quickly reuse them. The following code will run the passed closure inside 
the worker thread. At this point the channels aren't used yet, we don't need them until step 3, assuming we reach that 
step and the PSR-15 middleware doesn't short circuit the request and sends it's own response.

```php
$pool->run(function (ServerRequestInterface $request, Channel $input, Channel $output) {
    // Step 2. here
}, [$request, $input, $output]);
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/ReactMiddleware.php#L55-L58) 
uses a worker pool, which is an abstraction over pools to have dedicated worker threads for certain tasks.  

## 2. worker thread runs request through PSR-15 middleware

At this point we are inside the worker thread, where in our previous example where we have the 'Step 2 here'. So now we need 
to run the middleware chain passed to us. The code below is rather boring, it sets up a middleware and request handler 
chain that will end at the `Psr15RequestHandlerAdapter`. And there is where it will get interesting for us, when the 
request ends up there step 3 will kick in.

```php
$requestHandler = new Psr15RequestHandlerAdapter($input, $output);
foreach (array_reverse($this->middleware) as $middleware) {
    $requestHandler = new Next($middleware, $requestHandler);
}

$requestHandler->handle($request)
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/Handler.php#L33-L38) 
is the example above, but at a slightly more abstracted position.

## 3. Request passes through middleware and is sent to the main thread again for further processing

At the point the `Psr15RequestHandlerAdapter` receives a method call with the request as it has passed through the 
middleware, and this is where the magic kicks in. We first send the request back to the main thread, and then on the 
second line, we call `recv` on the channel in a blocking fashion. Now at this point this worker thread will freeze in a 
manner of speaking and wait for the main thread to send something to the `input` channel.

```php
$this->output->send(serialize($request));

$this->input->recv()
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/Psr15RequestHandlerAdapter.php#L28-L30).

## 4. Main thread comes up with a response and sends a response to the worker thread

We're switching back to the main thread now, where we wait for an object coming from the `output` channel. The moment 
we call `single` on the stream factory we're telling it to wait for only one message, and then stop listening. Once the 
promise returned by `single` resolves we can unserialize it, and pass it onto the next middleware. Internally the 
`single` method uses [`RxPHP`](https://github.com/ReactiveX/RxPHP) observables, so you can also use a channel for a 
continuous stream of objects, but that is beyond the need of this package. The beauty of this is that the underlying 
logic behind `single` is an event loop`ish mechanism that will poll for events in a loop.

```php
$this->streamFactory->single($output)->then(static function (string $request): ServerRequestInterface {
    return unserialize($request);
}, $reject)->then($next)
```

Once the next middleware is done, we serialize and send it through the `input` channel back to the worker thread. Which 
is still waiting for us.

```php
then(static function (ResponseInterface $response): string {
    return serialize($response);
}, $reject)->then(static function (string $response) use ($input): void {
    $input->send($response);
}, $reject);
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/ReactMiddleware.php#L46-L52).
[`The actual single logic`](https://github.com/reactphp-parallel/streams/blob/916844a8f0a2f0ce6d5d723ae9473fa71b1657cf/src/Factory.php#L28).
[`The actual logic behind single`](https://github.com/reactphp-parallel/event-loop/blob/aabe7af30675a2de63b303b6f184e757ed4ae1a6/src/EventLoopBridge.php#L24-L170).

## 5. Response passes back through the PSR-15 middleware

So at this point we've received the response from the main thread, and will flow through the chain we've set up in 
step 2 the moment `recv` returns something.

```php
return unserialize($this->input->recv());
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/Psr15RequestHandlerAdapter.php#L28-L30).

So once it has made it's way through the middleware chain, we return the response from the closure.

```php
return new Response($requestHandler->handle($request));
```

[`The actual logic`](https://github.com/reactphp-parallel/psr-15-adapter/blob/af509268c625dc44a230fd2867f0792490a20ab4/src/ReactMiddleware.php#L55-L58).

## 6. Response is send back to the main thread and passed back up the middleware chain

Abstracted away is a Future to Promise converter using the same event loop we use for channels. This has to be because 
the runtime encapsulated inside the pool returns a promise. And, where promises are push, futures are pull, so we use the 
event loop to notify us.

# The path forward from here

Initially I was hoping this middleware could deal with my PSR-15 needs. But I've ended up with a solution that is very 
similar with FPM, one main thread, and a pool of worker threads to handle requests. At the core this package, and the 
solution I went with are the same solution with different scopes. The reason I'm still writing about this middleware is 
because it adds incredible value to those, like me, who want to have a blazing fast application server with PSR-15 
middleware but don't want to have to convert all middleware to be compatible with `react/http`. 

# Looking into the future

While the model for this package is designed to put the blocking parts inside a worker thread and use it from the main 
thread, the opposite model is also useful. Were instead of accessing a blocking bit of code inside a worker thread from 
the main thread, you access non-blocking HTTP client running in the main thread from blocking code inside a child 
thread. Another example would be a central logger where worker threads have access to a proxy implementing PSR-3 and 
call that for their logging needs, which gets passed to the main thread before it ends up on `STDOUT`/`STDERR`, Loggly, 
Sentry or where ever you want to put your logs. If you don't want to bother with implementing async handlers for what 
you need, create a logger worker thread that deals with that. (Haven't tried it out, but I'm assuming worker thread to 
worker thread channels are possible.)

# Conclusion

A couple of years ago creating something like this would mean using child process, which are slow and expensive to 
start, expensive to keep around, and less than ideal to work with. By using threads for this, it is suddenly very cheap 
to spawn a worker for any (blocking) work you want to off load from the mean thread. (During testing spawning 300+ 
threads within a second was as if it second nature for PHP.) This package uses that ability to make something 
inherently incompatible, compatible. There is many cool things we can do with these cheap threads, we discussed PSR-15 
extensively, touched PSR-3, but what about [`PSR-11`](https://github.com/reactphp-parallel/psr-11-container-proxy)?
