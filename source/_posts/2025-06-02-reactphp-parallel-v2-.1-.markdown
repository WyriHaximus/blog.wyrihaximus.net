---
layout: post
title: "ReactPHP Parallel v2(.1)"
date: 2025-06-02 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ext-parallel
tags:
- PHP
- ReactPHP
- Threads
- ext-parallel
social:
  image_relative: /images/posts/pexels-wolfgang-weiser-467045605-30720851.jpg
---

With fibers in PHP 8.1 and templates types in [`Promise`](https://reactphp.org/promise/) v3 the main focus for 
[ReactPHP Parallel v2](https://github.com/reactphp-parallel/reactphp-parallel) is a simpler type safe user facing API. With [`Promise`](https://reactphp.org/promise/) v3 and 
[`Async`](https://reactphp.org/async/) v4 providing exactly with we need to make this transformation.

![Vibrant Cargo Trains at Hamburg Rail Terminal](/images/posts/pexels-wolfgang-weiser-467045605-30720851.jpg)
> [Photo by Wolfgang Weiser from Pexels](https://www.pexels.com/photo/vibrant-cargo-trains-at-hamburg-rail-terminal-30720851/)

<!-- More -->

## Early Days

ReactPHP parallel started out as, and still at it’s core is, a 
[`Future`](https://www.php.net/manual/en/class.parallel-future.php) to [`Promise`](https://reactphp.org/promise/) 
converter. ([That repository](https://github.com/reactphp-parallel/future-to-promise-converter) has been archived and 
the package marked abandoned as the event loop for v2 provides this functionality and is the central place for 
converting futures and channels.)

That formed the foundation to get results from threads and push all CPU bound operations there. Around the same time 
I started working on my [ReactPHP optimized Docker images](https://github.com/wyrihaximusnet/docker-php). Running 
threads required a ZTS (Zend Thread Safe) PHP version. And by building my own images it was easy to get ext-parallel 
and other extensions in the same images matching my needs, it gives me an easy to use set up.

Wrapped it up with a infinite pool of threads and a limited pool, depending on your needs. The former will just run 
anything while the latter is useful to keep CPU and memory usage under control.

## Crazy Ideas

Beyond the initial foundation I wanted to create a way to make promises look sync by creating an object proxy. This 
proved possible by doing the following things:

- Run that code in a thread
- Create a proxy for any class that returns a promise
- Pass the proxy into the code that runs in the thread
- Run the original object in the main thread and proxy calls and results back and forth using channels

The thing that blew my mind at the time was, aside from threads in PHP, is that it works. It worked very well for 
small and simple calls. The more complex things got the slower things got. Even wrote a PRS-11 container proxy to be 
injected in the thread and automate everything.

Created a [PSR-15 adapter](https://github.com/reactphp-parallel/psr-15-adapter) to use PSR-15 middleware in a 
ReactPHP HTTP server without blocking the event loop. Unlike the object proxy this ran the blocking code inside a 
worker thread pool. Also blogged about that a couple of years 
ago: [`Building the next generation react/http PSR-15 adapter`](http://localhost:8000/2020/09/next-gen-react-http-psr-15-adapter/)

## Fibers

With PHP 8.1 Fibers turned those ideas upside down. The object proxy lost it’s purpose and has been archived, so are 
all related packages to it. It also significantly reduced my use for threads to almost 0. Given that green threads 
(Fibers) are significantly faster than threads this is the way forward for all but CPU-bound use cases.

## Personal Usage

My cluster at home however does run some code that runs image conversion and image manipulation (combining a set of 
images into one bigger image) for [`WyriMaps`](https://www.wyrimaps.net/wow/). This is where threads shine. The main 
thread runs [`Bunny`](https://github.com/jakubkulhan/bunny) getting messages from 
[`RabbitMQ`](https://www.rabbitmq.com/). It uses worker threads to do the heaving image work. The conversion isn’t 
super time consuming, it most of time takes less then a second per image to convert. Bigger images take longer but 
that’s as expected. Stitching a couple hundred images together into one however can take minutes.

```php
$this->logger->info($logLine . 'Converting');
$png = $this->threads->run(static function (string $from, string $data): string {
    $tmpFileName = '/tmp/' . md5($from) . '.' . md5($data) . '.blp.png';
    $img         = imagecreatefromblp($data, $from);
    unset($data);
    imagepng($img, $tmpFileName, 0, PNG_NO_FILTER);
    imagedestroy($img);

    $contents = file_get_contents($tmpFileName);
    unlink($tmpFileName);

    return $contents;
}, [
    $from,
    await($sourceFile->getContents()),
]);
$this->logger->info($logLine . 'Writing');
await($destination->putContents($png));
$this->logger->info($logLine . 'Converted');
```

## v2

Version 2 returns the original focus on running CPU-bound operations in threads. But utilizes fibers to have a sync 
looking API by doing the following two things:

- Anything that returned a promise in v1 new returns the value the future holds
- Anything that returned an observable v1 now returns an `iterable`

This results in a much simpler API: No need to handle promises or `await` them, plus Observables can now easily used 
in a `foreach` without using [external packages](https://github.com/WyriHaximus/reactphp-awaitable-observable).

All of this, however, means you need to run everything inside a fiber. So the examples while a simpler API, are 
wrapping all those calls inside a fiber, making gain improvement look less. But, that should be extracted away by your 
HTTP Server, Queue Worker, etc etc. (For sure mine do, but more on that later this year.)

## v2.1

v2 was originally planned to be PHP 8.2 and up, but after a support request before release I lowered it to PHP 8.1 
with the plan to release v2.1 soon after to bring it back up to PHP 8.2 which turned into PHP 8.3. Mainly due to QA 
tooling reasons making it easier to maintain it.

## Future

There are two features I want to bring to ReactPHP Parallel this year. One is updating the Worker Pool package from v1 
to v2. It’s a nice syntactic sugar wrapper around other pools to have dedicated pools/threads to specific types of 
work. This cleans up the API from:

```php
$threads->run(static function (string $file): string {
	return file_get_contents($file);
}, [__FILE__]);
```

To:

```php
$worker->perform(new File(__FILE__));
```

The other is adding support for ReactPHP Streams to the streams package. The goal there is to take a ReactPHP Stream 
and stream is over a channel to a thread, but also the other way around. This could for example using blocking file 
parsing in the thread and streaming each bit of data we get into a HTTP response:

```php
new HttpServer(function (ServerRequestInterface $request) {
	$stream = $threads->run(static function (string $file): string {
	  foreach ((new Reader($from))->generateRecords() as $row) {
		  yield $row + PHP_EOL;
	  }
	});
	
	return new Response(body: $stream);
});
```

# Conclusion

Building ReactPHP Parallel v1 has allowed me to experiment with some really crazy ideas, for that time, that turned 
out to be working. It thought me how to think about threads and multi core usage on both a single core VPS and 
Kubernetes, and how that impacts both. And it all started with a need to try and process as many images as 
possible (which now runs on Serverless using [`Bref`](https://bref.sh/) Ironically):

![Parallel Queue Backlog graph](/images/posts/parallel-queue-backlog-graph.jpeg)
