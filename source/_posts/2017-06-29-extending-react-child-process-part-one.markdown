---
layout: post
title: "Extending ReactPHP's Child Processes"
date: 2017-06-29 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Child Processes
- PHP
social:
  image_relative: /images/posts/T9I6A89.jpg
---

[`react/child-process`](https://github.com/reactphp/child-process)  is very flexible and can work a lot of ways but sometimes you don't want to be bothered with the details of how it works and *just want* a simpler API to do that.

<!-- More -->

# wyrihaximus/react-child-process-promise

This package was initially created as the work horse behind [`wyrihaximus/cpu-core-detector`](https://github.com/WyriHaximus/php-cpu-core-detector) for getting CPU information quick and easily.
In a nutshell it is a 20 line wrapper around [`react/child-process`](https://github.com/reactphp/child-process) that buffers everything coming through `STDOUT` and `STDERR` from the process and resolves all of that through a promise once the process exits. 

To use it pass it an instance of the event loop and a child process `Process` instance.

```php
\WyriHaximus\React\childProcessPromise($loop, new Process('nproc'))->done(function (ProcessOutcome $result) {
    echo 'Found ', $result->getStdout(), ' CPU cores in this machine', PHP_EOL;
});
```

# wyrihaximus/react-child-process-messenger 

A few years ago I was doing a lot of similar looking projects that did RPC communication with child processes. 
Which resulted in writing [`wyrihaximus/react-child-process-messenger`](https://github.com/WyriHaximus/reactphp-child-process-messenger) and [`wyrihaximus/react-child-process-pool`](https://github.com/WyriHaximus/reactphp-child-process-pool) (we'll go over pool in the next article) so I wouldn't have to reimplement that code in each new project. 
It evolved from a wrapper around [`react/child-process`](https://github.com/reactphp/child-process) that handled all communication between the parent and the child with a lot of hands on coding required. Into a package that takes a class name and takes care of the rest.

For example a class that gives you the time and microtime:

```php
use React\EventLoop\LoopInterface;
use WyriHaximus\React\ChildProcess\Messenger\ChildInterface;
use WyriHaximus\React\ChildProcess\Messenger\Messages\Payload;

class Tardis implements ChildInterface
{
    public static function create(Messenger $messenger, LoopInterface $loop)
    {
        $messenger->registerRpc('time', function (Payload $payload) {
            return [
                'time'      => time(),
                'microtime' => microtime(true),
            ];
        });
    }
}
```

(Note: the returned resolve always has to be an array because the communication is JSON serialized and assumes arrays.)

All we need to do is tell the `MessengerFactory` that we want to create a new parent from the `Tardis` class and it takes care of creating a new parent messenger, spawn the child process and then resolve the promise notifying the user it is ready for use.

```php
MessengerFactory::parentFromClass(Tardis::class, $loop)->then(function (Messenger $messenger) {
    return $messenger->rpc('time');
})->done(function (array $times) {
    var_export($times);
});
```

# Conclusion

Child processes are very useful for a lot of different purposes, from image manipulation till gathering output from existing programs. 
These two packages are create to make such operations easier. 
In the next post will go over two other packages for more advanced and powerful uses.
