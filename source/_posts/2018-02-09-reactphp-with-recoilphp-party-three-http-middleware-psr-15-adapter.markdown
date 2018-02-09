---
layout: post
title: "ReactPHP with RecoilPHP: Creating for/http-middleware-psr15-adapter"
date: 2018-02-09 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- RecoilPHP
- ReactPHP Series
- PSR-15
tags:
- ReactPHP
- RecoilPHP
- Coroutines
- PHP
- PSR-15
---

There are more uses for coroutines than just making working with promises easier. In this post we're diving into the 
details on how they are used by the [Friends of ReactPHP](https://github.com/friends-of-reactphp) in the 
[PSR-15 Middleware adapter](https://github.com/friends-of-reactphp/http-middleware-psr15-adapter) for 
[`react/http`](https://reactphp.org/http/).

<!-- More -->

When we started discussing how middleware for `react/http` should work we also look at the state of PSR-15 at the 
time. We decided against implementing it directly because of the fully blocking nature of PSR-15, in favour of 
`callable`. Which turned into an even better decision when return type hints where added to it to PSR-15. Now I 
love PSR-15, and middleware in general, which is why I created 
[for/http-middleware-psr15-adapter](https://github.com/friends-of-reactphp/http-middleware-psr15-adapter) to bridge the 
gap.

This didn't go without without hours and hours of debugging, trial and error, and the use of some 
[`magic`](https://github.com/nikic/PHP-Parser). The [PHP parser](https://github.com/nikic/PHP-Parser) in combination 
with eval is where part of the magic happens, but recoil is required to trick the middleware in thinking it is doing 
a synchronous operation while in fact it is doing an asynchronous operation under the hood.

# Writing middlewares/response-time as a react/http middleware

To illustrate what has to happen to bridge both worlds lets take a look at 
[`middlewares/response-time`](https://github.com/middlewares/response-time) and write is as react/http middleware 
instead of a PSR-15 middleware.

First off this is the PSR-15 version at time of writing:

```php
class ResponseTime implements MiddlewareInterface
{
    const HEADER = 'X-Response-Time';

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $server = $request->getServerParams();
        $startTime = $server['REQUEST_TIME_FLOAT'] ?? microtime(true);
        $response = $handler->handle($request);
        return $response->withHeader(self::HEADER, sprintf('%2.3fms', (microtime(true) - $startTime) * 1000));
    }
}
```

It does just one thing and that is calculate the time it took calling `$handler->handle($request)`. Now consider the 
following code which is that middleware as react/http middleware.

```php
class ResponseTime
{
    const HEADER = 'X-Response-Time';

    public function __invoke(ServerRequestInterface $request, callable $next): PromiseInterface
    {
        $server = $request->getServerParams();
        $startTime = $server['REQUEST_TIME_FLOAT'] ?? microtime(true);
        return resolve($next($request))->then(function (ResponseInterface $response) use ($startTime) {
            return resolve($response->withHeader(self::HEADER, sprintf('%2.3fms', (microtime(true) - $startTime) * 1000)));
        });
    }
}
```

The code is nearly identical except for the promise handling. In the previous post we shown how recoil can be used 
to yield coroutines to turn promises into code that is easier to read by getting the resulting value from the promises. 
We can do the same here, but that means the PSR-15 middleware has to be rewritten just a small bit, like this:


```php
class ResponseTime
{
    const HEADER = 'X-Response-Time';

    public function process(ServerRequestInterface $request, $handler)
    {
        $server = $request->getServerParams();
        $startTime = $server['REQUEST_TIME_FLOAT'] ?? microtime(true);
        $response = (yield $handler->handle($request));
        return $response->withHeader(self::HEADER, sprintf('%2.3fms', (microtime(true) - $startTime) * 1000));
    }
}
```

Tada 🎉 the PSR-15 middleware it self just turned asynchronous. (Ok ok I'm exaggerating here but this is what 
needs to be changed to make the PSR-15 middleware workable with.) When running calling ResponseTime::process in 
a coroutine this middleware won't even notice that `$handler->handle($request)` now returns a promises due to the 
magic of coroutines.

# Transforming middleware on the fly

As we don't have control of the middleware the user wants to use we have to rewrite the middleware on the fly. This is where 
the [PHP parser](https://github.com/nikic/PHP-Parser) comes in. The code below is from the `YieldingMiddlewareFactory` of 
`for/http-middleware-psr15-adapter` and goes through parsing, changing, and putting the code back together for use.

```php
// Create parser
$parser = (new ParserFactory())->create(ParserFactory::PREFER_PHP7);
// Read file and parse it
$stmts = $parser->parse(file_get_contents($file));
// Go through the parsed file tree and make changes where required
$stmts = self::iterateStmts($stmts);
// Turn the tree into runable code by printing it 
$code = (new Standard())->prettyPrint($stmts);
```

Within `YieldingMiddlewareFactory::iterateStmts` a few thing happen, at the code it will iterate over all `$stmts` (the nodes 
in the AST). First all interfaces are stripped off a class. This is done because we are going to change method signatures 
(removing the return type) and it doesn't match the interface anymore without.

```php
if ($stmt instanceof Class_) {
    $stmt->implements = [];
}
```

Second when we come across the method `process` on the middleware we remove the return type, and the type hint for the second 
argument. The second argument's type hint is removed because the  `RequestHandlerInterface::handle` signature also has 
`ResponseInterface` as return type and the request handler we inject returns a promise.

```php
if ($stmt instanceof ClassMethod && $stmt->name === 'process') {
    $stmt->returnType = null;
    $stmt->params[1]->type = null;
}
```

Thirdly when we come across the call to `RequestHandlerInterface::handle` we wrap it in a `yield`. This bit of code assume the 
name of the variable holding the request handler isn't changed into something other than `handler`.

```php
if ($stmt instanceof MethodCall) {
    if ($stmt->var instanceof Variable && $stmt->var->name == 'handler' && $stmt->name == 'handle') {
        return new Yield_($stmt);
    }
}
```

Now that we changed all the code required to make this adapter work we put it back together, add a random prefix to the class name 
and run it through `eval` and then instantiate it.

# Wrapping it up

We have a slightly adjusted middleware we can use. Now we just need to put that to good once. All we need to do is run the middleware, 
ensure the returned value is a promise (and wrap it if it isn't) and then resolve the promise:

```php
// Wrapping promise
return new Promise\Promise(function ($resolve, $reject) use ($request, $next) {
    // Start and execute the coroutine
    $this->kernel->execute(function () use ($resolve, $reject, $request, $next) {
        // Try to catch any errors coming up during execution of the middleware
        try {
            $response = $this->middleware->process($request, new RecoilWrappedRequestHandler($next));
            // Ensure $response is a promise, otherwise we can't yield it and this callable won't turn into a coroutine 
            if ($response instanceof ResponseInterface) {
                $response = Promise\resolve($response);
            }
            // Yield the response from the promise and then resolve the promise wrapping the coroutine
            $response = (yield $response);
            $resolve($response);
        } catch (Throwable $throwable) {
            // Reject the promise if any error occured
            $reject($throwable);
        }
    });
});
```

# Usage

Because we're rewriting the PSR-15 middleware code on the fly we can't pass in an instance, but we have to pass in the 
full class name and constructor arguments for it's creation. (In our example we don't have any constructor arguments 
though. But more on that and other options can be found on the 
[`for/http-middleware-psr15-adapter` readme](https://github.com/friends-of-reactphp/http-middleware-psr15-adapter/#usage).)

```php
new Server([
    new PSR15Middleware(
        $loop, // The react/event-loop (required because we need it for recoil's react kernel)
        ResponseTime::class
    ),
    function (ServerRequestInterface $request) {
        // Handle request
    },
]);
```

# A word of caution and advise

Rewriting a PSR-15 middleware (or any third-party code) on the fly like this is bat-shit-crazy and should be used with 
care and an integration test suite to ensure it works as expected even when updated down the road. The code makes 
certain assumptions on how most (the 80%) of PSR-15 middleware will work. And some middleware like 
[`middlewares/request-handler`](https://github.com/middlewares/request-handler) won't work because they don't call the 
passed request handler.

Personally I'm using it to collect response times, create an access log among things. The preset I'm using is available 
as [`wyrihaximus/react-http-psr-15-middleware-group `](https://github.com/WyriHaximus/reactphp-http-psr-15-middleware-group). 

I hope to have inspired you to dive into using ReactPHP with RecoilPHP, there are some new things to learn about how to 
write code for it. My suggestion is to play around with code from the examples to figure out what works and what doesn't. 
One thing that won't work are return types, because once you yield the return type of your function will be `\Generator`.
