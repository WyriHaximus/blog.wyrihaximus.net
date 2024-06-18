---
layout: post
title: "Updating (PHP) packages to ReactPHP Promise v3, and test your types with PHPStan"
date: 2024-06-18 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- PHPStan
tags:
- PHP
- ReactPHP
- PHPStan
- PHP8.1
- PHP8.2
social:
  image_relative: /images/posts/updating-php-packages-to-reactphp-promise-v3--and-test-your-types-with-phpstan.jpg
---

With version 3, react/promise adds template types to communicate what kind of data the promise will hold once resolved. 
Add react/async 4.2 with https://github.com/reactphp/async/pull/40 to that and return type hints are a thing and both 
PHPStan and Psalm will understand them.

![Photo of coloured lab veils](/images/posts/updating-php-packages-to-reactphp-promise-v3--and-test-your-types-with-phpstan.jpg)
> [Photo by Kindel Media](https://www.pexels.com/photo/colorful-liquids-in-test-tubes-8325719/)

<!-- More -->

These past few weeks I’ve been working on upgrading all my PHP packages to 8.2+ and the update for ReactPHP packages 
also will include Promise v3. This means that if you want to use any of my packages with Promise v3, you’ll need to be 
on PHP 8.2. (With sponsorships that number can be lowered, but only to a certain point.)

During the work on https://github.com/reactphp/promise/pull/247 it became apparent that we needed a way to validate 
our expected return types. PHPStan provides a way to do that with the `PHPStan\Testing\assertType`.

Let’s assume we have a function named `futurePromise` that returns a promise which resolves when the event loop has 
done another tick. The implementation is pretty simple:

```php
/**
 * Promise that resolves once future tick is called.
 *
 * @param mixed $value Value to return on resolve.
 */
function futurePromise($value = null): PromiseInterface
{
    $deferred = new Deferred();
    Loop::futureTick(static function () use ($deferred, $value): void {
        $deferred->resolve($value);
    });

    return $deferred->promise();
}
```

This is a pretty straightforward implementation:
* Created deferred
* Schedule tick
* Return promise
* One tick happens resolve the promise with the value passed into the function

To make it communicate the type the promise will hold, it had to be changed to:

```php
/**
 * Promise that resolves once future tick is called.
 * 
 * @param T $value Value to return on resolve.
 *
 * @return PromiseInterface<T>
 *
 * @template T
 * @phpstan-ignore-next-line
 */
function futurePromise(mixed $value = null): PromiseInterface
{
    /** @var Deferred<T> $deferred */
    $deferred = new Deferred();
    Loop::futureTick(static function () use ($deferred, $value): void {
        $deferred->resolve($value);
    });

    return $deferred->promise();
}
```

And we feed PHPStan these two tests for type safety.

```php
<?php

declare(strict_types=1);

use function PHPStan\Testing\assertType;
use function WyriHaximus\React\futurePromise;

assertType('React\Promise\PromiseInterface<bool>', futurePromise(true));
assertType('React\Promise\PromiseInterface<null>', futurePromise());

```

In total that is 4 changed lines and one new file in this package (ignoring the PHPStan ignore there for the argument 
with default value). To ensure PHPStan (and Psalm) understand whatever you put into the first argument, comes out 
through the promise. It works by telling PHPStan that `$value` is of type T, and that we return it by wrapping it into 
a `promise<T>`. There is a lot more happening behind the scenes, which is why we had to point out that `$deferred` is 
`Deferred<T>`.

Ultimately, we want to get to this, but for now promise typing is a major first step:

```php
<?php

declare(strict_types=1);

use function PHPStan\Testing\assertType;
use function WyriHaximus\React\futurePromise;

assertType('bool', futurePromise(true));
assertType('null', futurePromise());
```

This will be done by using `await()` inside `futurePromise` in this case. Or as close as possible to the promise 
returned. But for this post we’re focusing on adding it to a package.

## Conclusion

While the removal of `done()` and erroring on handled rejections might be the most impactful changes in how 
`react/promise` affects users directly. The added type safety's value isn’t to underestimated. PHPStan’s 
`assertType` function is incredible valuable to test and proof your functions/methods return types. I strongly 
encourage all package owners out there to add these tests if you use `@template` types in your packages.
