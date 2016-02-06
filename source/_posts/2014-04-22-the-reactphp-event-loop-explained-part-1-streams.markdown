---
layout: post
title: "The ReactPHP event-loop explained: Part 1 Streams"
date: 2014-04-24 10:01
comments: true
categories:
- PHP
- ReactPHP
- Event Loop
- DNS
- Telnet
- Streams
---

The event-loop is the core of ReactPHP. It provides an abstraction layer for polling file descriptors, timers and deferred execution of callbacks. On this event-loop most other react packages are build one way or the other.

In part 1 of this series we'll build a simple telnet service that allows you to lookup the IP addresses of hostnames. Part 2 go in-depth about timers. Part 3 will cover ticks. This is a long and verbose post, here is a TL;DR.

<!-- More -->

# [This post is deprecated by the new series here.](/2015/01/reactphp-introduction) #

## TL;DR

![](/images/posts/multitaskingOctopus.jpg)

## The Event-Loop

The way the event-loop works is that it continuously checks a number of read- and write-streams and notifies you when the first read- or write-stream is ready to read from or write to. When a file descriptor is ready to read from or be written to the callback is triggered so it can be read from with [fread()](http://php.net/fread) or written to with [fwrite()](http://php.net/fwrite). Besides checking streams, it will also check any number of timers and run their callbacks if it’s their time.

These callbacks form the core of the [reactor pattern](http://en.wikipedia.org/wiki/Reactor_pattern) and hence the name `react`. Other low level packages such as [react/stream](https://github.com/reactphp/stream) abstract this implementation detail, but also register file descriptors and a callback.

The default event loop is built on [stream_select()](http://php.net/stream_select) that PHP comes with by default. This is the default in case no better performing event-loop extension is installed. If you happen to have `ext-libevent` installed, you can also use an event loop that is based on `libevent`. It can utilizes the `libevent` built-in timers and performs significantly better when handling a high number of streams.

## Getting started

First lets create an event-loop using the factory. You can instantiate a specific loop directly but the factory selects the best performing loop for you.

```php
<?php
$loop = \React\EventLoop\Factory::create();
```

After you created the loop you set everything up for whatever task you have in mind. Once you’ve done that you start the loop.

```php
<?php
$loop->run();
```

Usually, the loop will keep running forever, because the loop itself is an infinite loop. <!-- wording -->
This is useful because we usually want to continuously keep checking streams and don't want to exit our program.

There are two things that will stop the loop. First in case it has nothing more to do, i.e. no more streams to be checked and no more timers to fire.

And second when you call the `stop` method:

```php
<?php
$loop->stop();
```

This method can only be invoked from a callback invoked from within the loop.
This makes sense because it is the only situation where the loop is actually running.

Note that because of this, if you put it right after `run()` like the following bit of code, it will never actually reach it.

```php
<?php
$loop->run();
$loop->stop();
```

## Listening for incoming connections

So far we have the event-loop orchestrate what can read/write and when.
Now we can focus on implementing a service that handles incoming connections and communicates with internal components of our application.
In this example I’ll walk you through how a user connects with a simple telnet-like service to lookup a hostname.

But first things first, we have to set up a listening socket.

```php
<?php
$socket = new \React\Socket\Server($loop);
$socket->listen(13378, '0.0.0.0');
// 0.0.0.0 binds to all interface addresses and thus can be reached locally and through the public IP 
```

This creates a socket using [stream_socket_server()](http://php.net/stream_socket_server) internally. A socket is a file descriptor and similar to what a [fopen()](http://php.net/fopen) would return.

When a new connection is made to that IP + port, the file descriptor from [stream_socket_server()](http://php.net/stream_socket_server) triggers the read event in the event-loop and it calls the callback on it.
That in it’s turn will call [stream_socket_accept()](http://php.net/stream_socket_accept) to accept the connection creating a file descriptor for that specific connection and hooks it into the loop waiting for a read event.

## Handling the incoming connection

We now need to handle that incoming connection. Luckily react is build on [Événement](https://github.com/igorw/evenement/) for event handling.

A `connection` event is triggered when a new connection is made to our service.
We bind to the `connection` event and get a new `\React\Socket\Connection` instance as first argument. This instance represents an established TCP/IP connection from a client. It extends the stream object which uses a buffer internally for the data that has to be written.
We welcome to new connection by writing a welcome message back to the client.

```php
<?php
$socket->on('connection', function(\React\Socket\Connection $conn) {
	$conn->write('Hello state your resolve' . PHP_EOL);
});
```
The data you pass to the `write()` method will be queued up in the connection stream’s outgoing buffer. Note that react will not send the data immediately, as writing to the socket could be blocking.

Since this is the first time data will be written to the connection the buffer adds the file descriptor to the loop but this time for writing. This ensures the data will be sent as soon as the event loop notifies the buffer that the underlying socket is ready to receive outgoing data. The buffer then writes the first bit of data to the client. It keeps doing that until all that is in the buffer is written to the client. Once the buffer is empty, it removes the file descriptor from the loop for writing.

## Reading from the client
It's time to read from the client and find out what it wants from our service. Again, we need to bind an event listener. That `data` event triggers when the event-loop notifies the stream that it's ready to be read from and reads a chunk.

```php
<?php
$socket->on('connection', function(\React\Socket\Connection $conn) {
	$conn->on('data', function($data) {});
});
```

Notice the empty function we registered with the `data` event. That chunk, in our simple example app, is going to contain a hostname. This hostname will be passed to a DNS resolver so that we can reply with the resolved IP address.

## Setting up the DNS resolver

Before we can do anything we need to setup the DNS resolver. We’ll be using the cache resolver so we don’t make unnecessary lookups.

```php
<?php
$dnsResolverFactory = new \React\Dns\Resolver\Resolver();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);
```

The DNS resolver looks up hostnames asynchronously and has a Promised based interface. (For more information about promises check the [reactphp/promise repository on Github](https://github.com/reactphp/promise).)

## Handling user input

Now that we have the DNS Resolver setup we are ready to look up hostnames. We replace the empty `data` event listener on the connection with this. The might look overwhelming but it's all about `$dnsResolver->resolve()`. The rest just makes sure only one hostname is resolved per resolve call.   

```php
<?php
$buffer = '';
$conn->on('data', function($data, $conn) use ($dnsResolver, &$buffer) {
	$buffer .= $data;
	if (strpos($buffer, PHP_EOL) !== false) {
		$hostnames = explode(PHP_EOL, $buffer);
		$buffer = array_pop($hostnames);
		foreach ($hostnames as $hostname) {
			$hostname = trim($hostname);
			$dnsResolver->resolve($hostname)->then(function($ip) use ($conn, $hostname) {
				$conn->write($hostname . ': ' . $ip . PHP_EOL);
			});
		}
	}
});
```

The above does a few things. First it buffers any incoming data and check if there is a `PHP_EOL`. If this is the case it splits it but that `PHP_EOL` and iterates over all lines. For each line it sends out a resolve request.

## Looking up a hostname

### Sending out the request

When `$dnsResolver->resolve()` is called it will create a new outgoing connection to the DNS server using `stream_socket_client()`. That connection (a file descriptor) will be passed to a stream which will add it to the event-loop for reading. The connection is open and the DNS Resolver sends a DNS request by calling `write()` on the stream. The stream will utilize the buffer again to add itself to the event-loop for writing and keep writing out data in the buffer until it's done. (And then remove itself from the event-loop for writing again.)

### Handling the response

While it is waiting for a response the event-loop keeps an eye on all other registered read and write streams. At some point the read stream of our DNS query will be ready to read from because the DNS server responded. The resolver handles the incoming data and closes the connection, thus removing it from the event-loop. Now the only open file descriptor on the event-loop is from our clients connection.

## Responding to the client

Now that we have the IP by the hostname we can return it to the client. The final act by the resolver is to resolve the promise. By resolving the promise the current execution point ends up inside our promise callback at line `11`. That line calls the write method on our client connection and writes the hostname we looked up follow by the resolving IP. (Starting the stream buffer writing cycle up again.)

## Conclusion

The event-loop keeps all read/write streams informed that they can read or write to a file descriptor. That behaviour allows asynchronously operations that normally would run synchronously. The events described are only for 1 incoming connection and 1 outgoing connection but you can lookup as many hostnames as you'd like. I would suggest trying it out, it shows the true nature of asynchronous where the first hostname you lookup might be the slowest resolving hostname.

## The end result         

The following code is the result of the above post:
```php
<?php

require './vendor/autoload.php';

$loop = \React\EventLoop\Factory::create();

$socket = new \React\Socket\Server($loop);
$socket->listen(13378, '0.0.0.0');

$dnsResolverFactory = new \React\Dns\Resolver\Factory();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);

$socket->on('connection', function(\React\Socket\Connection $conn) use ($dnsResolver) {
    $buffer = '';
    $conn->on('data', function($data, $conn) use ($dnsResolver, &$buffer) {
        $buffer .= $data;
        if (strpos($buffer, PHP_EOL) !== false) {
            $hostnames = explode(PHP_EOL, $buffer);
            $buffer = array_pop($hostnames);
            foreach ($hostnames as $hostname) {
                $hostname = trim($hostname);
                $dnsResolver->resolve($hostname)->then(function($ip) use ($conn, $hostname) {
                    $conn->write($hostname . ': ' . $ip . PHP_EOL);
                });
            }
        }
    });
    $conn->write('Hello state your resolve' . PHP_EOL);
});

$loop->run();
```

The full project including `composer.json` can be found on [Github](https://github.com/WyriHaximus/ReactDNSTelnet).