---
layout: post
title: "ReactPHP: Streams"
date: 2015-02-17 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Streams
- PHP
---

Streams are the blood-vessels that transport the blood (data) pumped through your program by the heart of ReactPHP: the `event-loop`. 

![Stream](/images/posts/Hd1kXIa.gif)

<!-- More -->

The focus of this article will be on streams. How to use them in combination with sockets and the filesystem is beyond the scope of this article and will be covered by a future articles.

##### Installation #####

The [`event-loop`](/2015/02/reactphp-event-loop/) only deals with low level PHP streams, which [`react/stream`](https://github.com/reactphp/stream#stream-component) wraps, so we have to install `react/stream` separately:

```bash
composer require react/stream
```

##### A Simple stream #####

Lets, once again, go back to the [timers example](/2015/01/reactphp-timers). Instead of just echoing it out we'll be writing it to [STDOUT](http://en.wikipedia.org/wiki/Standard_streams#Standard_output_.28stdout.29) instead, which is supported in PHP by opening [`php://stdout`](http://php.net/manual/en/wrappers.php.php) with [`fopen`](http://php.net/manual/en/function.fopen.php). (Keeping the example simple, [`clue/stdio-react`](https://github.com/clue/php-stdio-react/) does this better and cleaner.)

By passing the resource from `fopen` into a [`Stream`](https://github.com/reactphp/stream/blob/master/src/Stream.php) object we can read from it and write to it in an asynchronous nature. Let's start with just writing. By calling `$stream->write(++$i . PHP_EOL);` instead of `echo ++$i, PHP_EOL;` we push the data into the stream's buffer. Once the resource from `fopen` is reading for writing, the buffer will write its buffer into the resource. You on the other hand can keep adding data into it without having the worry about when the resource is ready for writing. (The `Buffer` maintains a softlimit and keeps you informed when you reach that and go under it again. This is specifically useful to prevent memory from overflowing.)

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$stream = new \React\Stream\Stream(fopen('php://stdout', 'w'), $loop);

$i = 0;
$loop->addPeriodicTimer(1, function(React\EventLoop\Timer\Timer $timer) use (&$i, $loop, $stream) {
    $stream->write(++$i . PHP_EOL);

    if ($i >= 15) {
        $loop->cancelTimer($timer);
        $stream->end();
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/16549.js" id="asciicast-16549" async></script>

##### Piping ##### {#piping}

Data usually comes in from somewhere else then a timer. Consider the following example where we pipe data from [STDIN](http://en.wikipedia.org/wiki/Standard_streams#Standard_input_.28stdin.29) directly into STDOUT. Effectively making an echo program that returns everything we put into it.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$read = new \React\Stream\Stream(fopen('php://stdin', 'r+'), $loop);
$write = new \React\Stream\Stream(fopen('php://stdout', 'w+'), $loop);
$read->pipe($write);

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/16550.js" id="asciicast-16550" async></script>

The beauty about piping one stream into the other is that it takes care of everything. (From the data passing from one into the other, ending the write stream when the read stream is done, and pausing when necessary.)

##### Rainbows and kittens #####

More often we want to do something with the data we get before sending it somewhere else. The example below is a very simple version of [cowsay](http://en.wikipedia.org/wiki/Cowsay). Just like the previous example it will echo whatever we put into it back to us bit a little more [fabulous](https://github.com/whatthejeff/fab) and told to us by a [kitten](https://github.com/calebeoliveira/kittens). (Even added a check for the word `quit` to close the streams and effectively ending our loop.)

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$superFab = new \Fab\SuperFab();

$read = new \React\Stream\Stream(fopen('php://stdin', 'r+'), $loop);
$write = new \React\Stream\Stream(fopen('php://stdout', 'w+'), $loop);

$read->on('data', function ($data, $read) use ($write, $superFab) {
    if (trim($data) == 'quit') {
        $write->close();
        $read->close();
    }

    $input = trim($data);
    $line = Kitten::get() . ' says "' . $input . '"';
    $line = $superFab->paint($line);
    $line .= PHP_EOL;
    $write->write($line);
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/16552.js" id="asciicast-16552" async></script>

##### Community example: Phergie #####

As said before streams are the blood vessels of ReactPHP so this week finding community example was a lot easier then last week. But instead of two this week a big shout out to [Matthew Turland](https://twitter.com/elazar) creator and maintainer [Phergie](http://phergie.org/). Recently Phergie v3 has been completely rewritten to use ReactPHP, as an [IRC](http://en.wikipedia.org/wiki/Internet_Relay_Chat) bot it communicates with streams over sockets with remote IRC servers. Getting started with Phergie is a simple as creating [a config file](https://github.com/phergie/phergie-irc-bot-react/blob/master/config.sample.php) and running `./vendor/bin/phergie`:

```php
<?php
use Phergie\Irc\Connection;
return [
    'plugins' => [],
    'connections' => [
        new Connection([
            'serverHostname' => 'irc.freenode.net',
            'username' => 'Elazar',
            'realname' => 'Matthew Turland',
            'nickname' => 'Phergie3',
        ]),
    ]
];
```

Want Youtube support? There is a [plugin](https://github.com/phergie/phergie-irc-plugin-react-youtube) for that. Twitter? There is a [plugin](https://github.com/phergie/phergie-irc-plugin-react-twitter) for that. [The list with available plugins is still expanding.](https://github.com/phergie/phergie-irc-bot-react/wiki/Plugins#available-plugins)

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/streams)

##### Conclusion #####

Streams are one of the most important components of ReactPHP. Without them exchanging data with the filesystem, sockets, or anything else transporting data would be a lot harder and clunkier. Streams take a lot of work out of hands and they pave the way for the `react/socket`, `react/socket-client`, and everything building upon those like the `react/http-client` component. We'll be seeing streams a lot in the upcoming articles.
