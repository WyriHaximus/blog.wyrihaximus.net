---
layout: post
title: "ReactPHP with RecoilPHP: Creating a Munin Node Client"
date: 2018-02-07 13:37dw
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
  image_relative: /images/posts/DOdntVSXUAATJql.jpg
---

In the previous post we've covered the basics of coroutines. In this post we're going to build a munin-node client 
specifically to fetch switch port traffic counters. During this post we not just write an munin-node client, we also 
deal with some domain logic. All code examples contain comments about what is going on and why. There is a lot of 
knowledge in those as well so be sure to read the comments. 

<!-- More -->

# Writing a munin node client

For years I've been using [`Munin`](http://munin-monitoring.org/) to monitor my sites, servers, and home infrastructure. In the 
past two years I've been enjoying using [`Grafana`](https://grafana.com) for the more recent graphs. (Last minute/hour/day kind of range.)
Thus I'm using munin-node to read data from SNMP from the managed switches in the house. In this post we'll write a munin node client 
that can be used to get useful data from munin node to create the map shown below: 

<blockquote class="twitter-tweet" data-conversation="none" data-lang="en"><p lang="en" dir="ltr">Took me some fiddling but got the values correct 🎉. Put in my <a href="https://twitter.com/RIPE_Atlas?ref_src=twsrc%5Etfw">@RIPE_Atlas</a> probe as well for fun. Map doesn&#39;t include non-infrastructure because it would ge rather big with everything that is connected 🤐. <a href="https://t.co/dRAAWRGycG">pic.twitter.com/dRAAWRGycG</a></p>&mdash; Cees-Jan 🥞  Kiewiet (@WyriHaximus) <a href="https://twitter.com/WyriHaximus/status/929829974470688769?ref_src=twsrc%5Etfw">November 12, 2017</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

# Set up

Before we start we need a few things, namely:

```shell
composer require recoil/recoil recoil/react react/event-loop react/promise react/promise-stream
```

New in this list for this post is [`react/promise-stream`](https://reactphp.org/promise-stream/), which has a handful 
of useful functions bridging the stream and promise worlds lets us wait for an emitted event and then return a promise. 
For example the following code:

```php
$data = yield new Promise(function ($resolve, $reject) ue ($stream) {
    $stream->once('data', function ($data) use ($resolve) {
        $resolve($data);
    });
});
```

Can be written as:

```php
$data = yield first($stream);
```

There is also a [`buffer`](https://reactphp.org/promise-stream/#buffer) function in `react/promise-stream` that will 
buffer the entire stream before resolving the promise but we can't use that here because we have to interact with 
munin-node over the connection. We'll be using the [`first`](https://reactphp.org/promise-stream/#first) function 
throughout this post because it suites our needs very well.

# Skeleton

The following code is the base class, we'll add functions and code going from here. Also this class is supposed to be 
ran into a coroutine, as shown at the end of this post.

```php
final class MuninNodeSnmp
{
    /**
     * @var LoopInterface
     */
    private $loop;

    /**
     * @var Connector
     */
    private $connector;

    /**
     * @param LoopInterface $loop
     */
    public function __construct(LoopInterface $loop)
    {
        $this->loop = $loop;
        $this->connector = new Connector($loop);
    }
}
```

# Orchestrating

For the class to be useful we need an entry point, in this class that is the `gather` method. It calls the other 
functions opening the connection, fetching the port list, fetching port values, and as final step close the connection. 

```php
public function gather(string $node)
{
    list ($node, $prefix) = explode('|', $node);
    
    /** @var ConnectionInterface $connection */
    $connection = yield $this->connect($node);
    
    $ports = [];
    foreach (yield $this->fetchPorts($connection, $prefix) as $port) {
        $ports[$port] = yield $this->fetch($connection, $port);
    }

    // Close the connection now that we're done
    $connection->write('quit' . "\n");

    return $ports;
}
```

# Connecting

First we need to connect to the munin node and discard the initial welcome message. (Although we appreciate it we 
don't have a use for it.)

```php
private function connect(string $node)
{
    /** @var ConnectionInterface $connection */
    $connection = yield $this->connector->connect($node);

    /* Read the munin-node welcome message and discard it */
    yield first($connection);

    // Return the connect now that the welcome message has been received
    return $connection;
}
```

The expected communication is:

```
<< # munin node at SNMP-switch02
```

# Fetching ports

Now that we have a connection we can start fetching information about switch ports. Because in this project we want to 
know about both specific ports and the total throughput of a switch we fetch all ports. To do that we first need to 
fetch a list of ports:

```php
private function fetchPorts(ConnectionInterface $connection, string $prefix)
{
    // Request a list of items
    $connection->write("list $prefix\n");
    $buffer = '';
    do {
        // We've calling the React\Promise\Stream\first function here which returns a
        // promise resolving on the first data event, or on the event name you give it as second parameter.
        $buffer .= yield first($connection);
        // Stop once we fond `_uptime`, which is the last in the list
    } while (substr(trim($buffer), -7) != '_uptime');

    $ports = [];
    // Cut the response line in an array of items and iterate of it
    foreach (explode(' ', $buffer) as $port) {
        // Filter out any unwanted items such as error count and uptime
        if (strpos($port, '_err_') !== false) {
            continue;
        }
        if (strpos($port, '_uptime') !== false) {
            continue;
        }

        // Filter out LAG ports (LAG ports are bounded ports for more performance or resilience)
        $chunks = explode('_', $port);
        if ((int)$chunks[count($chunks) - 1] > 25) {
            continue;
        }

        $ports[] = $port;
    }

    return $ports;
}
```

The expected communication is:

```
>> list 192.168.1.7
<< snmp_192.168.1.7_if_1 snmp_192.168.1.7_if_1000 snmp_192.168.1.7_if_2 snmp_192.168.1.7_if_3 snmp_192.168.1.7_if_5 snmp_192.168.1.7_if_6 snmp_192.168.1.7_if_7 snmp_192.168.1.7_if_8 snmp_192.168.1.7_if_err_1 snmp_192.168.1.7_if_err_1000 snmp_192.168.1.7_if_err_2 snmp_192.168.1.7_if_err_3 snmp_192.168.1.7_if_err_5 snmp_192.168.1.7_if_err_6 snmp_192.168.1.7_if_err_7 snmp_192.168.1.7_if_err_8 snmp_192.168.1.7_uptime
```

# Fetching port values

With the list of ports we have now we can start fetching metrics from them. We do this by writing out the `fetch` command and 
keep fetching data until we see a period on a new line. We then iterate of all returned lines and gather the metrics from them.

```php
private function fetch(ConnectionInterface $connection, string $name)
{
    // Request values for the given $name, in our case a port
    $connection->write('fetch ' . $name . "\n");

    $buffer = '';
    // Keep going until we find a period as last value
    do {
        $buffer .= yield first($connection);
    } while (substr(trim($buffer), -1) != '.');

    // Strip any new lines and periods from the outer bounds of the buffer
    $buffer = trim($buffer);
    $buffer = trim($buffer, '.');
    $buffer = trim($buffer);

    $throughput = 0;
    // Iterate through all returned values and combine their values in $throughput
    foreach (explode("\n", $buffer) as $line) {
        list($name, $counter) = explode(' ', $line);
        // Ignore any lines which have the value U
        if ($counter == 'U') {
            continue;
        }

        // Increase the throughput counter, this includes both sent and receive counters (we want both)
        $throughput += $counter;
    }

    return $throughput;
}
```

The expected communication is:

```
>> fetch snmp_192.168.1.7_if_1
<< recv.value 1833908809
<< send.value 3161297892
<< .
```

# Putting everything together

We have all methods needed for a working client. Now all we need it to put it together and make it usable. we do that 
in a few steps. First we bootstrap the autoloader, event loop, and munin-node client. Secondly we iterate over the 
commandline arguments and assume the `munin-node-host:port|switch-ip` format. (In my case `172.29.0.45:4972|192.168.1.7` 
where `172.29.0.45` is the box hosting munin-node, listening at port `4972`, for the switch with IPv4 `192.168.1.7`. 
Plus you can add multiple, as shown in the example later on below.) And while iterating over the argument it gathers 
the port throughput and returns it when done. When all are gathering we display the resulting array:

```php
require 'vendor/autoload.php';

$loop = Factory::create();
$muninNode = new MuninNodeSnmp($loop);

$kernel = ReactKernel::create($loop);
$kernel->execute(function () use ($muninNode, $argv) {
    $data = [];
    // Iterate of all arguments, the following syntax is assume "munin-node-host:port|switch-ip"
    // The switch IP is needed for the list command
    for ($i = 1; $i < count($argv); $i++) {
        $data[$argv[$i]] = yield $muninNode->gather($argv[$i]);
    }

    var_export($data);
});

$loop->run();
```

The code is available at [`munin-node.php`](https://github.com/WyriHaximus/ReactBlogSeriesExamples/blob/master/recoil-munin-node/munin-node.php).

<script src="https://asciinema.org/a/yGdTjDotxw5GfmXt3AhL6hccU.js" id="asciicast-yGdTjDotxw5GfmXt3AhL6hccU" async></script>

In the above example all my three switches at home are queried (over a VPN) and the total bytes per port per switch 
are outputted.

# Friday's post: PSR-?

In Friday's post we'll go into bridging a PSR to async land.
