---
layout: post
title: "ReactPHP with RecoilPHP"
date: 2017-06-30 13:37dw
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

Which is a lot easier to grasp

# Writing a munin node client

For years I've been using [`Munin`](http://munin-monitoring.org/) to monitor my sites, servers, and home infrastructure. In the 
past two years I've been enjoying using [`Grafana`](https://grafana.com) for the more recent graphs. (Last minute/hour/day kind of range.)
Thus I'm using munin-node to read data from SNMP from the managed switches in the house. In this post we'll write a munin node client 
that can be used to get useful data from munin node to create the map shown below: 


GRAFANA NETWORK TOPOGRAPHY (GIF)

# Set up

Before we start we need a few things, namely:

```shell
composer require recoil/recoil recoil/react react/socket
```

Also due to the Generator based nature of coroutines everything you do with them has to be wrapped into a anonymous function. So in 
this example we're going to create a class that takes care of all of that. The following code is the base class, we'll add functions 
and code going from here.

```php
<?php

namespace App\Commands\Network;

use React\EventLoop\LoopInterface;
use function React\Promise\Stream\first;
use React\Socket\ConnectionInterface;
use React\Socket\Connector;
use Recoil\Kernel;
use Recoil\React\ReactKernel;

final class SNMP
{
    /**
     * @var LoopInterface
     */
    private $loop;

    /**
     * @var Kernel
     */
    private $kernel;

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

        $this->kernel = ReactKernel::create($loop);
        $this->connector = new Connector($loop);
    }

    public function gather(string $node)
    {
        $this->kernel->execute(function () use ($node) {
            $this->zugZug($node);
        });
    }
}
```

# Connecting

First we need to connect to the munin node.

```php
public function zugZug(string $node)
{   
    /** @var ConnectionInterface $connection */
    $connection = yield $this->connector->connect($munin);
    
    /* Read the munin-node welcome message and discard it */
    yield first($connection);
}
```

# Conclusion

Child processes are very useful for a lot of different purposes, from image manipulation till gathering output from existing programs. 
These two packages are create to make such operations easier. 
In the next post will go over two other packages for more advanced and powerful uses.
