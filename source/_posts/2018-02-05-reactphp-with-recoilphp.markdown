---
layout: post
title: "ReactPHP with RecoilPHP: An introduction"
date: 2018-02-05 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- RecoilPHP
- ReactPHP Series
tags:
- ReactPHP
- RecoilPHP
- Coroutines
- PHP
social:
  image_relative: /images/posts/coroutines-gone-wrong.png
---

Getting your mind wrapped around async nature can be mind bending at first. But with [`RecoilPHP`](https://github.com/recoilphp) 
you can write code promise as if you're writing sync code. 

<!-- More -->

Normally you would write code using promises like this:

```php
operation()->then(function ($result) {
    return anotherOperation($result);
})->then(function ($result) {
    return yetAnotherOperation($result);
})->done(function ($result) {
    echo $result;
});
``` 

With RecoilPHP the same can be written as:

```php
$result = yield operation();
$result = yield anotherOperation($result);
$result = yield yetAnotherOperation($result);
echo $result;
```

Which is a lot easier to grasp for the mind compared to using promises, as there is a lot less going on visually. Plus it feels 
and looks more like synchronous PHP.

# Set up

To get the above example running we need a bit more than shown. First off we need a few packages:

```shell
composer require recoil/recoil recoil/react react/event-loop react/promise
```

Secondly we need a basic set up be able to use coroutines.


```php
$loop = \React\EventLoop\Factory::create();
$kernel = \Recoil\React\ReactKernel::create($loop);

$kernel->execute(function () {
    //
});

$loop->run();
```

There a major requirement at this point. The lambda we pass into `$kernel->execute` must return a 
generator so we have to use a `yield` in the body of that lambda. **Note: We can't put it a level deeper in a function call.**

# Open connections and Listening sockets

To demonstrate the synchronous asynchronous nature of coroutines we're going to retrieve the count of listening sockets, and 
the count of open connections through [`netstat`](https://linux.die.net/man/8/netstat). We'll be using one of my own 
[packages](https://github.com/WyriHaximus/reactphp-child-process-promise) to quickly get the outcome of [`netstat`](https://linux.die.net/man/8/netstat).

```shell
composer require wyrihaximus/react-child-process-promise
```

We're going to call [`netstat`](https://linux.die.net/man/8/netstat) twice, once to count all the listening sockets, and a second time to count all established connections.
No matter how often you run [`netstat.php`](https://github.com/WyriHaximus/ReactBlogSeriesExamples/blob/master/recoil/netstat.php) the 
order will always be the same.

```php
$kernel->execute(function () use ($loop) {
    $listeningCount = yield childProcessPromise($loop, new Process('netstat -tulpen | wc -l'));
    echo 'Listening Sockets: ', $listeningCount->getStdout(), PHP_EOL;
    $connectionCount = yield childProcessPromise($loop, new Process('netstat -tupen | grep ESTABLISHED | wc -l'));
    echo 'Open Connections: ', $connectionCount->getStdout(), PHP_EOL;
});
```

<script src="https://asciinema.org/a/jjZCzmLxgKk8SNuDGo28s6lNW.js" id="asciicast-jjZCzmLxgKk8SNuDGo28s6lNW" async></script>

# Two coroutines

Now as shown above the order within a coroutine is always the same. But you can always start another coroutine that does something else, in 
the following example we will try to resolve all hostnames from `$argv`, but first we need `react/dns` to do DNS looks up.

```shell
composer require react/dns
```

Now we'll add the following coroutine [`netstat.php`](https://github.com/WyriHaximus/ReactBlogSeriesExamples/blob/master/recoil/netstat.php) 
and save it as [`netstat-dns.php`](https://github.com/WyriHaximus/ReactBlogSeriesExamples/blob/master/recoil/netstat-dns.php).

```php
$kernel->execute(function () use ($loop, $argv) {
    $resolver = (new Factory())->create('8.8.8.8', $loop);
    for ($i = 1; $i < count($argv); $i++) {
        $ip = yield $resolver->resolve($argv[$i]);
        echo $argv[$i], ': ', $ip, PHP_EOL;
    }
});
```

<script src="https://asciinema.org/a/kKb1Z1SoBfZEjnb92QEfjFqDE.js" id="asciicast-kKb1Z1SoBfZEjnb92QEfjFqDE" async></script>

# Bonus tip, order matters

Also you might have noticed that the IP and counts are retrieved on their own line. Not only  does it look cleaner, it also matters a lot 
in execution order. The code runs to the exact location of the yield and then pauses from that point until the promise resolves. Consider 
the following line of code

```php
echo $argv[$i], ': ', yield $resolver->resolve($argv[$i]), PHP_EOL;
```

As you can see in the outcome of that code, the hostname gets printed, then that coroutine is paused and the other takes over 
and starts printing it's first bit of text. By getting the desired value before printing we avoid this.

![Coroutine order gone wrong](/images/posts/coroutines-gone-wrong.png)

# Dealing with errors

All of the above examples assume a happy flow, no errors, but errors are a core element in programming. When you reject a promise 
with an exception Recoil will throw it for you. Consider [`error.php`](https://github.com/WyriHaximus/ReactBlogSeriesExamples/blob/master/recoil/error.php).

```php
$kernel->execute(function () {
    try {
        yield reject(new Exception('error'));
    } catch (Throwable $et) {
        echo (string)$et;
    }
});
```

It has the following outcome:

<script src="https://asciinema.org/a/qXtNNuXMcOdflT0Zd9JBcFAXG.js" id="asciicast-qXtNNuXMcOdflT0Zd9JBcFAXG" async></script>

# Further reading

Later this week two more posts will be posted going into different use cases of coroutines using Recoil. But if you want to dive 
deeper in how coroutines work now, [Nikita Popov](https://twitter.com/nikita_ppv) wrote a great, but bit long and technical, 
article how coroutines work under the hood:
[Cooperative multitasking using coroutines (in PHP!)](https://nikic.github.io/2012/12/22/Cooperative-multitasking-using-coroutines-in-PHP.html).
