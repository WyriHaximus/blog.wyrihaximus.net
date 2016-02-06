---
layout: post
title: "ReactPHP: Event Loop"
date: 2015-02-24 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Event Loop
- PHP
---

The [`event-loop`](https://github.com/reactphp/event-loop) is the heart of ReactPHP, it pumps all the [stream's data around](/2015/02/reactphp-streams), runs [timers](/2015/01/reactphp-timers) when they are due, and processes the [ticks](/2015/02/reactphp-ticks). But there is not just one, ReactPHP supports four out of the box.

![Newton's Cradle](/images/posts/cZYRQp8.gif)

<!-- More -->

##### The reactor pattern #####

[`ReactPHP`](http://reactphp.org/) is based on the [reactor pattern](http://en.wikipedia.org/wiki/Reactor_pattern), hence the name. A reactor system is always single threaded by definition and uses an event loop to handle different kind of events. A well known implementer of the reactor pattern is [nginx](http://nginx.org/). 

##### Note! ######

Every event loop supported by ReactPHP works a little bit differently from the next one. So the workings described below might not be 100% applicable for every supported event loop. All event loops utilize a `while` loop in their abstraction that keeps going until there is nothing more to do or we tell it to stop.

##### Ticks #####

When adding a [tick](/2015/02/reactphp-ticks) (both next and future) to the event loop, it's pushed onto a `SplQueue`. On each loop iteration all outstanding ticks will be executed.

##### Timers #####

[Timers](/2015/01/reactphp-timers) are a little bit different. For example PHP's build in event loop [`stream_select`](http://php.net/stream_select) doesn't do timers at all so they are dealt with the same way as ticks in that abstraction. But [`libevent`](http://php.net/manual/en/book.libevent.php), [`ext-event`](http://php.net/manual/en/book.event.php), and [`libev`](https://github.com/m4rw3r/php-libev) handle them within their event loop as event. Which makes them more accurate then `stream_select` because they handle them when they are due earlier because they don't process all ready I/O event first.

##### Streams #####

In most event loops streams are registered, just as timers, as events. Different loops handle this slight different but they all support read and write events in one way or the other. (For duplex streams (read and write), the stream has to be registered as both read and write!) So when you write to a [stream](/2015/02/reactphp-streams) it will register that stream with the event loop for writing (if it isn't already). When the underlying resource is ready for writing the event loop notifies the stream and it will `fwrite` the contents of it's buffer into the resource. Same for read streams but the other way around. Instead of calling the write method you have to set an event listener. Everytime the underlying resource is ready for reading the stream is notified and attempts to `fread` from it. The resulting red data is then passed into the event listener along with a reference to it self:

```php
$stream->on('data', function ($data, ReadableStreamInterface $self) {});
```

On close or when there is nothing more to write. The stream unregisters a stream from the event loop.

##### Running the loop #####

1. Upon startin the event loop they first run all the registered ticks before checking on I/O activity.
2. Then the [`stream_select`](http://php.net/stream_select) loop will run all due timers. (The other loops handle this in step 3.)
3. And then all the event loops will handle all waiting (I/O) events.
4. [`goto 1;`](http://php.net/goto) while there is still something to do.

##### Conclusion #####

The event loops are a mission critical component in reactor pattern applications. Without them nothing will get done and no data would be moved from A to B. However they are the simplest component to use from a developers perspective: just create them and run them when you hooked everything you're going to use into them.
