---
layout: post
title: "Cancelling ReactPHP fibers"
date: 2022-02-22 13:37dw
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
  image_relative: /images/posts/php-8.1-fibers-cancelled.jpg
---

A feature that we really needed to make our fiber integration complete is the cancellation of them. Or to be more 
precise, the cancellation any awaited promise yielding operations in that fiber and as a consequence the fiber that 
those are awaited in.

![Cancelled PHP 8.1 fibers (green threads)](/images/posts/php-8.1-fibers-cancelled.jpg)
> [Photo by Jeffrey Czum from Pexels](https://www.pexels.com/photo/concrete-building-under-blue-sky-4004291/)

<!-- More -->

Promises returned by the `async` function can be cancelled and when done they will cancel any recursive `async` call
and any currently awaited promise using the `await` function. In the following example `echo 'b';` will never
be reached, and the `await` function at the bottom will also throw an exception with the following message
`Timer cancelled`.

```php
$promise = async(static function (): int {
    echo 'a';
    await(sleep(2));
    echo 'b';

    return time();
})();

$promise->cancel();
await($promise);
```

If you however decide to try and catch that `await` you will reach `echo 'b';`. The exception you caught however
isn't thrown by the bottom await function. Just as with synchronous code catching it lets you ignore the exception or
error that is thrown.

```php
$promise = async(static function (): int {
    echo 'a';
    try {
        await(sleep(2));
    } catch (\Throwable) {
        // No-Op
    }
    echo 'b';

    return time();
})();

$promise->cancel();
await($promise);
```

When a fiber is cancelled, all currently pending and future awaited promises will be cancelled. As such the following
example will never output `c` and a timeout exception will be thrown.

```php
$promise = async(static function (): int {
    echo 'a';
    try {
        await(sleep(2));
    } catch (\Throwable) {
        // No-Op
    }
    echo 'b';
    await(sleep(0.1));
    echo 'c';

    return time();
})();

$promise->cancel();
await($promise);
```

Any nested `async` and `await` calls are also canceled. You can nest this as deep as you want. As long as you await
every promise yielding function you call. The following example will output `abc`.

```php
$promise = async(static function (): int {
    echo 'a';
    await(async(static function(): void {
        echo 'b';
        await(async(static function(): void {
            echo 'c';
            await(sleep(2));
            echo 'd';
        })());
        echo 'e';
    })());
    echo 'f';

    return time();
})();

$promise->cancel();
await($promise);
```

Be very much aware that if you call a promise yielding function and not await it, it will not be cancelled. The
following example will output `acb`.

```php
$promise = async(static function (): int {
    echo 'a';
    sleep(0.001)->then(static function (): void {
        echo 'b';
    });
    echo 'c';

    return time();
})();

$promise->cancel();
```
