---
layout: post
title: "Extending ReactPHP's Child Processes Part Two"
date: 2017-11-16 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- Child Processes
- Pool
- Closure
- PHP
---

[`react/child-process`](https://github.com/reactphp/child-process)  is very flexible and can work a lot of ways but sometimes you don't want to be bothered with the details of how it works and *just want* a simpler API to do that.

<!-- More -->

#### wyrihaximus/react-child-process-pool 

The pool package has nearly exactly the same API as `wyrihaximus/react-child-process-messenger` 
with the difference that you're dispatching calls to the first available child process in the pool.
This makes setting up resource pools or pools for CPU intensive fairly simple. On Linux it even supports 
assigning a child process to each CPU core available. (OSX and Windows CPU core detection are on the roadmap.)
In fact `wyrihaximus/react-child-process-pool` is using [`wyrihaximus/react-child-process-promise`](/2017/06/extending-react-child-process-part-one/#wyrihaximus%2Freact-child-process-promise) 
from the previous article under the hood to detect the CPU core count.

#### Doctrine DBAL

Lets set up a flexible pool that executes [`Doctrine DBAL`](https://github.com/doctrine/dbal) queries for you and walk you through it in the code comments. 
But first we need a class to run inside the child process:  

```php
use React\EventLoop\LoopInterface;
use WyriHaximus\React\ChildProcess\Messenger\ChildInterface;
use WyriHaximus\React\ChildProcess\Messenger\Messenger;
use WyriHaximus\React\ChildProcess\Messenger\Messages\Payload;
use function React\Promise\resolve;

final class DoctrineDBAL implements ChildInterface
{
    /**
     * How to get the DBAL here is beyond the scope of this article,
     * but lets assume it is an instance of `REPLACE_WITH_ACTUAL_DBAL_FQCN`.
     */
    private $dbal;
    
    /**
     * Set up any available RPC's
     */
    public static function create(Messenger $messenger, LoopInterface $loop)
    {
        /**
         * Register the query RPC we'll be using in our next file.
         */
        $messenger->registerRpc('fetchColumn', function (Payload $payload) {
            return resolve([
                'column' => $this->dbal->fetchColumn(
                    $payload['query'],
                    $payload['parameters'] ?? [],
                    0
                ),
            ]);
        });
    }
}
```

Now that we have a class handling the `DBAL` interaction to run inside the child process:

```php
use React\EventLoop\Factory as EventLoopFactory;
use WyriHaximus\React\ChildProcess\Pool\Factory\Flexible;
use WyriHaximus\React\ChildProcess\Pool\PoolInterface;

/**
 * 1. First off we need the event loop.
 */
$loop = EventLoopFactory::create();

/**
 * 2. We need to tell the pool how many processes it should spawn minimally and maximally.
 *    This allows us to quickly reuse when we need them or close down processes when we don't.
 */ 
$options = [
    Options::MIN_SIZE => 0, // Keeping MIN_SIZE at 0 means no process will be running when 
                            // there are no outstanding or queued calls.
    Options::MAX_SIZE => 5, // Depending on what the pool does and how many resources your 
                            // box has you set MAX_SIZE to something suitable.
    Options::TTL      => 3, // TTL at 3 means a process is kept a live for 3 seconds when it 
                            // has nothing left to do until it is terminated. 
];

/**
 * 3. Create the pool with the child process class we've created in the previous codeblock and 
 *    our process options.
 */
Flexible::createFromClass(DoctrineDBAL::class, $loop, $options)->done(function (PoolInterface $pool) {
    // You now have a pool that spawns no child processes on start.
    // But when you call rpc a new child process will be started for 
    // as long as the pool has work in the queue. With a maximum of five.
    $pool->rpc(
        MessageFactory::rpc(
            'fetchColumn',
            [
                'query' => 'SELECT COUNT(id) AS user_count FROM users',
            ]
        )
    )->done(function (Payload $result) {
        $c = $result['column'];
        echo 'Found ', $c, ' ', ($c === 1 ? 'user' : 'users'), PHP_EOL;
    });
    
    // Note that once done with the pool we need to shut it down with $pool->terminate();
    // this ensures we don't let any child processes run unnesecary.
});

/**
 * 4. Run the loop and kick everything in motion
 */
$loop->run();
```

The only different with creating a flexible CPU core count pool is that we'd swap `Flexible` with `CpuCoreCountFlexible`. 
In that case `MAX_SIZE` is set to the number of CPU cores detected. I want to highlight the beauty of using minimum size zero
on a flexible pool again, especially with database connections this avoid errors like `MySQL has gone away` when there is a long
time between queries.

#### wyrihaximus/react-child-process-closure

Now the above example is very powerful already, but what if we could bring running a random closure from 
`wyrihaximus/react-child-process-promise` into the pool? That can be done with `wyrihaximus/react-child-process-closure`, and it 
isn't a big change to your code. There are however a few caveats as described on the [Super Closure readme](https://github.com/jeremeamia/super_closure#caveats)
utilized by `wyrihaximus/react-child-process-closure`, in short any referenced variable won't transfer over to the child.

```php
use WyriHaximus\React\ChildProcess\Closure\ClosureChild;
use WyriHaximus\React\ChildProcess\Closure\MessageFactory;

Flexible::createFromClass(ClosureChild::class, $loop, $options)->then(function (PoolInterface $pool) {
    $callback = function () {
        usleep(random_int(500, 1000));
        return ['microtime' => microtime(true)];
    };

    $promises = [];
    for ($i = 0; $i < 166; $i++) {
        $promises[$i] = $pool->rpc(MessageFactory::rpc($callback));
    }

    return all($prommises)->always(function () use ($pool) {
        $pool->terminate;
    });
})->done(function (array $payloads) {
    foreach ($payloads as $i => $payload) {
        echo $i, ': ', $payload['microtime'], PHP_EOL;
    }
});
```

#### Use with bunny/bunny for queue processing

Combining a flexible pool with [`bunny/bunny`](https://github.com/jakubkulhan/bunny) creates queue consumer that only requires resources when handling a message.

```php
use Bunny\Async\Client;
use Bunny\Channel;
use Bunny\Message;
use WyriHaximus\React\ChildProcess\Closure\ClosureChild;
use WyriHaximus\React\ChildProcess\Closure\MessageFactory;

// Since both set up methods return promises we'll wrap them in an `all` so we get them together when they succeed.
all([
    // Set up the flexible pool with the preferred $options.
    'pool' => Flexible::createFromClass(QueueMessageHandlingChild::class, $loop, $options),
    // Connect to RabbitMQ using Bunny and create a channel upon connecting.
    'channel' => (new Client($loop, [/** Bunny config */]))->connect()->then(function (Client $client) {
        return $client->channel();
    }),
])->done(function ($tools) {
    $pool = $tools['pool'];
    $channel = $tools['channel'];
    
    // Consume the messages from a queue named `queue`.
    $channel->consume(
        function (Message $message, Channel $channel) use ($pool) {
            // Up on message arrival we call the RPC `handleMessage` on the pool to handle the message
            // in a child process.
            $pool->rpc(
                MessageFactory::rpc(
                    'handleMessage',
                    [
                        'content' => $message->content,
                    ]
                )
            )->done(function () use ($message, $channel) {
                // Acknoledge the message on success
                $channel->ack($message);
            }, function () use ($message, $channel) {
                // Mark the message failed on failure so it can be retried
                $channel->nack($message);
            });
        }, 
        'queue'
    );
});
```

#### Conclusion

Child processes are very useful for a lot of different purposes, from image manipulation till gathering output from existing programs. 
These two packages are create to make such operations easier when dealing with a bulk of operations to be done. Which is why I've included 
the bunny example, a pattern I'm actively using that in production.

#### Bonus: rx/child-process

For those familiar with observables [`rx/child-process`](https://github.com/RxPHP/RxChildProcess) lets you stream the `STDOUT` and `STDERR` 
output with [`reactivex/rxphp`](https://github.com/ReactiveX/RxPHP) observables. And you can use all the cool reactivex operators on it. For 
those unfamiliar with observables I strongly recommend checking out [`RxMarbles`](http://rxmarbles.com/) for visualisations on Rx operators.

#### P.S.

The Doctrine DBAL example featured in this post can be found fully working at [`wyrihaximus/react-doctrine-dbal`](https://github.com/WyriHaximus/reactphp-doctrine-dbal) 
on Github ready to be experimented with. 
