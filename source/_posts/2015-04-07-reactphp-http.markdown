---
layout: post
title: "ReactPHP: HTTP"
date: 2015-04-21 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- HTTP
- PHP
social:
  image_relative: /images/posts/web-surfing.jpeg
---

Now that we know how to use the [`react/filesystem`](/2015/03/reactphp-filesystem/) it is time to build a [`HTTP`](http://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol) server using [`react/http`](https://github.com/reactphp/http).

![Websurfing](/images/posts/web-surfing.jpeg)

<!-- More -->


##### Installation #####

The installation, as with many [`ReactPHP`](http://reactphp.org/) packages, is simple and straight forward:

```sh
composer require react/http
```

##### Basic HTTP server #####

If you've searched for [`ReactPHP`](http://reactphp.org/) you probably ended up on [`reactphp.org`](http://reactphp.org/) which features the example below. That example is the simplest working [`HTTP`](http://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol) in [`ReactPHP`](http://reactphp.org/) and returns nothing more then [`Hello world`](http://en.wikipedia.org/wiki/%22Hello,_World!%22_program).

```php
<?php

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();
$socket = new React\Socket\Server($loop);
$http = new React\Http\Server($socket, $loop);

$http->on('request', function ($request, $response) {
    $response->writeHead(200, array('Content-Type' => 'text/plain'));
    $response->end("Hello World\n");
});

$socket->listen(1337);
$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/18485.js" id="asciicast-18485" async></script>

##### Basic text server #####

Now a [`webserver`](http://en.wikipedia.org/wiki/Web_server) generally does more then outputting [`Hello world`](http://en.wikipedia.org/wiki/%22Hello,_World!%22_program). Therefor we're combining it with the [`react/filesystem`](/2015/03/reactphp-filesystem/) component to read files from the [`filesystem`](http://en.wikipedia.org/wiki/File_system). To get started we list all the files in the webroot directory into the [`promise`](/2015/02/reactphp-promises/) `$files`. This saves us from relisting the webroot directory over and over again. Then when a request comes in we loop through the file list and check if there is a matching file. If there isn't we read the contents of [`404.txt`](http://en.wikipedia.org/wiki/HTTP_404) and return it. Once we have a filename we open it and start reading it's contents into a bufferedsink. Now that we have the file contents we make sure to close open file in case we need it again. Only then we'll write the contents of the file back to the requesting browser. (There is much room for improvement here. For example a file can only be requested once at the same time. This does however demonstrates how to build a very simple webserver.)

```php
<?php

use React\EventLoop\Factory;
use React\Filesystem\Filesystem;
use React\Filesystem\Node\File;
use React\Http\Request;
use React\Http\Response;

define('WEBROOT', __DIR__ . DIRECTORY_SEPARATOR . 'webroot');

require 'vendor/autoload.php';

$loop = Factory::create();
$socket = new React\Socket\Server($loop);
$http = new React\Http\Server($socket, $loop);
$filesystem = Filesystem::create($loop);
$files = $filesystem->dir(WEBROOT)->ls();

$http->on('request', function (Request $request, Response $response) use ($filesystem, $files) {
    echo 'Request for: ' . $request->getPath(), PHP_EOL;
    $files->then(function (SplObjectStorage $files) use ($filesystem, $request) {
        foreach ($files as $file) {
            if ($file->getPath() == WEBROOT . $request->getPath()) {
                return $file;
            }
        }

        return $filesystem->file(WEBROOT . DIRECTORY_SEPARATOR . '404.txt');
    })->then(function (File $file) {
        return $file->getContents()->then(function ($contents) use ($file) {
            return $file->close()->then(function () use ($contents) {
                return $contents;
            });
        });
    })->then(function ($fileContents) use ($response) {
        $response->writeHead(200, ['Content-Type' => 'text/plain']);
        $response->end($fileContents);
    });
});

$socket->listen(1337);
$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/18487.js" id="asciicast-18487" async></script>

##### Community example #####

This weeks community example [`sculpin`](https://sculpin.io/) is build and lead by [Beau Simensen](https://twitter.com/beausimensen). [`Sculpin`](https://sculpin.io/) is a static site generator and also this blog is build using it. [`react/http`](https://github.com/reactphp/http) is used in [`sculpin`](https://sculpin.io/) for the [`server`](https://sculpin.io/getstarted/#run-sculpin) flag. That flag turns [`sculpin`](https://sculpin.io/) into a miniature [`HTTP`](http://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol) server just serving your blog for local development. This makes it really use to work on it and perfect it before pushing it to the world.

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/http)

##### Conclusion #####

Building a simple webserver with [`react/http`](https://github.com/reactphp/http) is very simple and it gives your app it's own build in webserver you can use for specific use cases. [`Sculpin`](https://sculpin.io/) is the perfect example. But you could also use it to create a simple REST API for your app or [`microservice`](http://en.wikipedia.org/wiki/Microservices).
