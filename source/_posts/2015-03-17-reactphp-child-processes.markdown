---
layout: post
title: "ReactPHP: Child Processes"
date: 2015-03-17 13:37dw
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

[`react/child-process`](https://github.com/reactphp/child-process) is a package to spawn child processes ala [`symfony/process`](http://symfony.com/doc/current/components/process.html) utilizing [System program](http://php.net/manual/en/book.exec.php). Letting you run any program as child process, not limited to [`PHP`](http://php.net/).

![Everyone gets a process](/images/posts/T9I6A89.jpg)

<!-- More -->

##### Installation #####

Installation is very simple and is done by running the following composer require:

```sh
composer require react/child-process
```

##### Uptime parent #####

Lets create a basic parent process that runs the [`uptime`](http://unixhelp.ed.ac.uk/CGI/man-cgi?uptime) program and echo's it's output. Before we can start a child process we first need to create a `Process` object representing the program we want to run. We use that object to interact with the program we started. But first lets focus on running it. A thing you might notice is that we use a [`timer`](/2015/01/reactphp-timers/) before starting it in this example. The reason we do this is that if we run it without it the program will start before the loop starts and we could mis bits of communication from it.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();
$process = new React\ChildProcess\Process('uptime');

$loop->addTimer(0.001, function($timer) use ($process) {
    $process->start($timer->getLoop());

    $process->stdout->on('data', function($output) {
        echo $output;
    });
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17768.js" id="asciicast-17768" async></script>

##### Echo child #####

Lets once again revisit the echo counter example but instead the child process will pipe what ever comes in over STDIN to STDOUT and stop when the counter hits 15. Now the child process will also function without the parent so I've included a demo of that.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$read = new \React\Stream\Stream(STDIN, $loop);
$read->on('data', function ($data) use ($loop) {
    $data = trim($data);
    if ($data == 15) {
        $loop->stop();
    }
});
$read->pipe(new \React\Stream\Stream(STDOUT, $loop));

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17769.js" id="asciicast-17769" async></script>

##### Echo parent #####

Compared to the uptime parent you might notice a couple of new additions. First we use the `exit` event on the process it self to be notified when it exits. Secondly the process object has 3 [streams](/2015/02/reactphp-streams) attached to it for communication. There is no requirement to communicate over these streams, you can always use [ZMQ](http://zeromq.org/) or [Redis](http://redis.io/) if you prefer but these are build in and get you started off quickly:

- `stdin`  For writing input into the process.
- `stdout` For reading output from the process.
- `stderr` For reading errors from the process.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();
$process = new React\ChildProcess\Process('php echo_child.php');

$loop->addTimer(0.001, function($timer) use ($process) {
    $loop = $timer->getLoop();
    
    $process->on('exit', function($output) use ($loop) {
        $loop->stop();
    });
    
    $process->start($loop);

    $process->stdout->on('data', function($output) {
        echo $output, PHP_EOL;
    });
    
    $i = 0;
    $loop->addPeriodicTimer(1, function ($timer) use (&$i, $process) {
        $process->stdin->write($i++);
    });
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17770.js" id="asciicast-17770" async></script>

##### Computation child #####

Now one major use case for child processes is to do computational CPU heavy or other blocking operations in a separate process. The following example does 100.000 iterations of a SHA256 hash over a string + salt. (Note that this is just to show the effects.)

```php
<?php

$loop = React\EventLoop\Factory::create();

$read = new \React\Stream\Stream(STDIN, $loop);
$read->on('data', function ($datas) use ($loop) {
    $datas = explode(PHP_EOL, trim($datas));

    foreach ($datas as $data) {
        if ($data == 15) {
            $loop->stop();
            return;
        }

        for ($i = 0; $i < 100000; $i++) {
            $data = hash('sha256', time() . $data);
        }

        echo $data, PHP_EOL;
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17771.js" id="asciicast-17771" async></script>

##### Computation parent #####

Now this parent will just write in things to do for the child and the client will respond as soon as it has a chunk done. When pushing work to a child process it is recommended to use something like [`\SplQueue`](http://php.net/manual/en/class.splqueue.php) to keep the amount of work to do in the child buffer sane and no overflowing.

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();
$process = new React\ChildProcess\Process('php md5_child.php');

$loop->addTimer(0.001, function($timer) use ($process) {
    $loop = $timer->getLoop();

    $process->on('exit', function($output) use ($loop) {
        $loop->stop();
    });

    $process->start($loop);

    $process->stdout->on('data', function($output) {
        echo $output;
    });

    for ($i = 0; $i < 16; $i++) {
        $process->stdin->write($i . PHP_EOL);
    }
});

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/17783.js" id="asciicast-17783" async></script>

##### Community examples #####

No community examples this week, there aren't any example out there using it in open source as far as I could find.

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/child-process)

##### Conclusion #####

Child processes are a very powerful tool when you have to deal with blocking code in your react process. Anything from database/CPU pooling using `\SplQueue` and an X number of workers to run the actual operations to controlling other programs with it. Child processes make sure you keep control and your async code async by sandboxing blocking operations.
