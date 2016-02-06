---
layout: post
title: "AWS PHP SDK Asynchronously"
date: 2015-06-29 21:30dw
comments: true
categories:
- PHP
- ReactPHP
- AWS
tags:
- PHP
- ReactPHP
- AWS
social:
  image_relative: /images/posts/2232217.png
---

Just got off the [AWS SDK for PHP Office Hour](http://blogs.aws.amazon.com/php/post/TxJL2P81AVKIGZ/AWS-SDK-for-PHP-Office-Hour) hangout and it was great talking with both team members [Jeremy](https://twitter.com/jeremeamia) and [Michael](https://twitter.com/mtdowling). And one of the things we talked about was async access to the AWS services using the PHP SDK.

<!-- More -->

The goal of this post is to get the AWS PHP SDK client working asynchronously.

##### Requirements #####

To get started we need two things:

* The v3 SDK which can be installed with: [`composer require aws/aws-sdk-php`](https://github.com/aws/aws-sdk-php)
* My Guzzle v6 adapter: [`composer require wyrihaximus/react-guzzle-psr7`](https://github.com/WyriHaximus/react-guzzle-psr7)

##### Setting up the SDK #####

To setup the SDK we need a few ingredients that we pulled in installing the SDK and my adapter:

* The [reactphp event loop](https://github.com/reactphp/event-loop)
* My ReactPHP Guzzle handler
* Guzzle's handler stack
* And the AWS SDK

The event loop is needed by the handler that is passed into the Guzze's handler stack. Now note that we pass the handler stack into the SDK as the HTTP handler option. That tells the SDK to use Guzzle instead of creating it's own HTTP handler. (You also still have to pass credentials.)

```php
<?php

use Aws\Result;
use Aws\Sdk;
use GuzzleHttp\HandlerStack;
use React\EventLoop\Factory
use WyriHaximus\React\GuzzlePsr7\HttpClientAdapter;

require 'vendor/autoload.php';

$loop = Factory::create();
$sdk = new Sdk([
    'http_handler' => HandlerStack::create(new HttpClientAdapter($loop)),
]);
```

##### Making async calls #####

Now that we have the SDK setup to do async calls lets, as example, fetch an object from S3 and echo it's body:

```php
$sdk->createS3()->getObjectAsync([
    'Bucket' => 'yourbucket',
    'Key' => 'path/to/file.ext',
])->then(function (Result $result) {
    echo $result['Body'], PHP_EOL;
});
```

Note that we appended Async behind the getObject function to ensure it returns a promise.

##### Demo #####

The following is a recording of a directory listing on the S3 bucket of my blog using the [`wyrihaximus/react-filesystem-s3`](https://github.com/WyriHaximus/reactphp-filesystem-s3) adapter for [`react/filesystem`](https://github.com/reactphp/filesystem) I'm working on. On a side note the listing was done on a moving train through a 3G connection so it might look slow but that is due to the connection. Over a normal wifi or cable connection it is done within 2 to 3 seconds topping at 100 request a second.

<script type="text/javascript" src="https://asciinema.org/a/22198.js" id="asciicast-22198" async></script>
