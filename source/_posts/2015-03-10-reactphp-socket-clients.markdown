---
layout: post
title: "ReactPHP: Socket clients"
date: 2015-03-10 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Sockets
- Socket Clients
- PHP
social:
  image_relative: /images/posts/wargames-social.jpg
---

Last week I've covered creating a simple [socket server](/2015/03/reactphp-sockets), this week we'll create a client to communicate with it using `react/socket-client`.

![WarGames](/images/posts/wargames.jpg)

<!-- More -->

##### Installation #####

Once again installation is simple, just run the following composer command and it will pull in all dependencies:

```sh
composer require react/socket-client
```

##### We need DNS #####

Before we can make connections to anything we need a DNS resolver. Technically they aren't needed to lookup IP addresses we'll use in the examples. But the socket client requires it in case you're connecting to a hostname instead of an IP address. Another thing: it can't look up anything in your `hosts` file, so `localhost` won't resolve. Setting up is simple and we'll be using the cached version so we don't do a DNS query each time we need to look a hostname up. (You might remember it from the [promises article](/2015/02/reactphp-promises/).)

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dns = $dnsResolverFactory->createCached('8.8.8.8', $loop);
```

##### Connecting to the echo server #####

So lets one again take the counting example from the [timers](/2015/01/reactphp-timers/) article, mash that up with what we learned in the [streaming](/2015/02/reactphp-streams) article. And create a simple socket client that writes a counter into a connection stream to the echo server from the [sockets](/2015/03/reactphp-sockets) article. Now when you call the create method on the connector it will lookup the target host you give if it isn't an IP. Then it attempts to connect to the servers IP plus given port name.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dns = $dnsResolverFactory->createCached('8.8.8.8', $loop);
$connector = new React\SocketClient\Connector($loop, $dns);

$connector->create('127.0.0.1', 1337)->then(function (React\Stream\Stream $stream) use ($loop) {
	$i = 0;
	$loop->addPeriodicTimer(1, function(React\EventLoop\Timer\Timer $timer) use (&$i, $loop, $stream) {
		$stream->write(++$i . PHP_EOL);
	
		if ($i >= 15) {
			$loop->cancelTimer($timer);
			$stream->close();
		}
	});
    $stream->on('data', function ($data) {
		echo $data;
	});
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17494.js" id="asciicast-17494" async></script>

##### Tic Tac toe #####

That looked pretty simple right? Lets take the [tic tac toe](/2015/03/reactphp-sockets#tictactoe) game server from the sockets post and create a client for it. What this does is connect to the game server, echo everything the server sends it back to the CLI and pick a random location everytime the server sends `Your turn:`.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dns = $dnsResolverFactory->createCached('8.8.8.8', $loop);
$connector = new React\SocketClient\Connector($loop, $dns);

$connector->create('127.0.0.1', 1337)->then(function (React\Stream\Stream $stream) {
    $buffer = '';
    $stream->on('data', function ($data, $stream) use (&$buffer) {
        echo $data;
        $cols = ['a', 'b', 'c'];
        $rows = [1, 2, 3];

        $buffer .= $data;

        if (strpos($buffer, PHP_EOL) !== false) {
            $chunks = explode(PHP_EOL, $buffer);
            $buffer = array_pop($chunks);
            foreach ($chunks as $chunk) {
                if (trim($chunk) == 'Your turn:') {
                    $stream->write($cols[mt_rand(0 ,2)] . $rows[mt_rand(0 ,2)] . PHP_EOL);
                }
            }
        }
    });
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17495.js" id="asciicast-17495" async></script>

##### Community examples #####

This weeks community examples [`umpirsky/wisdom`](https://github.com/umpirsky/wisdom) and [`clue/docker-react`](https://github.com/clue/php-docker-react) utilize socket clients for the connection creating to remove servers.

##### umpirsky/wisdom #####

`umpirsky/wisdom` utilizes [`react/whois`](https://github.com/reactphp/whois) to check if a domain is available. By using `react/whois` it uses the socket client to connect to an external server attemping to fetch information about a domain. It's simple in use as the example from the github readme shows:

```php
<?php

$domain = 'umpirsky.com';
$wisdom = new Wisdom($client);
$wisdom
    ->check($domain)
    ->then(function ($available) use ($domain) {
        printf('Domain %s is %s.', $domain, $available ? 'available' : 'taken');
    });

// Outputs:
// Domain umpirsky.com is taken.
```

##### clue/docker-react #####

`clue/docker-react` is an asynchronous [Docker](https://www.docker.com/) API client that lets you controll a docker daemon. The following example fetches the version but it supports [more actions](https://github.com/clue/php-docker-react#client):

```php
<?php

$loop = React\EventLoop\Factory::create();
$factory = new Factory($loop);
$client = $factory->createClient('http://10.0.0.2:8000/');

$client->version()->then(function ($version) {
    var_dump($version);
});

$loop->run();
```

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/socket-clients)

##### Conclusion #####

Together with `react/socket`, `react/socket-client` provides the tools to communicate with remote servers and services. While they look like a small wrapper around streams they make for a lot more possibilities then just local streams. The tic tac toe example is just a simple one, imagen implementing niche protocols or sending out a bunch of HTTP connections in one go. `react/socket-client` makes that possible.
