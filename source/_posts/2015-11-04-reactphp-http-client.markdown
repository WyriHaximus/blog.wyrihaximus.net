---
layout: post
title: "ReactPHP: HTTP Client"
date: 2015-11-04 13:37dw
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- HTTP
- HTTP Client
- PHP
social:
  image_relative: /images/posts/NHw2qZs4NmlGw-social.gif
---

Aside from a [HTTP](/2015/04/reactphp-http) component ReactPHP also has a [HTTP Client](https://github.com/reactphp/http-client) component that lets your send out HTTP requests. It is incredibly handy when you need to communicate with for example [elasticsearch's REST API](https://www.elastic.co/), [AWS platform through their SDK](https://aws.amazon.com/sdk-for-php/) or the [RIPE Atlas](https://atlas.ripe.net/)&nbsp;[API](https://atlas.ripe.net/docs/rest/).

![Sending requests](/images/posts/NHw2qZs4NmlGw.gif)

<!-- More -->


##### Installation #####

As with the other components installing is a simple composer command that will pull the package plus it's dependencies into your project.

```sh
composer require react/http-client
```

##### Sending a simple request #####

As you might notice in the example below [we need the DNS component](/2015/03/reactphp-socket-clients#we-need-dns) to look up the IP address for the given hostnames. Once the resolver has been setup we can create a client using the client factory. The factory does nothing more then create a connector and secure connector and passes that into a new `React\HttpClient\Client` instance. That gives us the client we can send requests with. The client only has one method, the `request` method. The `request` method once again is a simple method that create a new instance for you, this time it is a `React\HttpClient\Request` instance, we'll be doing most of our interactions with this instance and the response.  

The example below creates a GET request to [example.com](https://tools.ietf.org/html/rfc2606#section-3). The request object it self implements a `WritableStreamInterface` so you can write to it just like any other stream, using the `pipe` method is also an option but that is a story for another post. Once the client received all the response headers it will emit a response object containing all the headers and emitting all the response data from the server. Now the `Reponse` object implements the `ReadableStreamInterface` so you can read from it like any other stream and once again pipe. In the example below we'll just echo all incoming data.

```php
<?php

use React\Dns\Resolver\Factory as DNSResolverFactory;
use React\EventLoop\Factory as EventLoopFactory;
use React\HttpClient\Factory as HttpClientFactory;

require 'vendor/autoload.php';

$loop = EventLoopFactory::create();

$dnsResolverFactory = new DNSResolverFactory();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);

$factory = new HttpClientFactory();
$client = $factory->create($loop, $dnsResolver);

$request = $client->request('GET', 'https://example.com/');
$request->on('response', function ($response) {
    $response->on('data', function ($data, $response) {
        echo $data;
    });
});
$request->end();

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/1senmr1enraiqiioca7ddpq3x.js" id="asciicast-1senmr1enraiqiioca7ddpq3x" async></script>

##### Sending two requests at the same time #####

Just like all other ReactPHP components the HTTP client handles multiple requests at the same time. The following example makes two requests at the same time:
 
```php
<?php

function call($client, $url) {
    $request = $client->request('GET', $url);
    $request->on('response', function ($response) {
        $response->on('data', function ($data, $response) {
            echo $data;
        });
    });
    $request->end();
}

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);

$factory = new React\HttpClient\Factory();
$client = $factory->create($loop, $dnsResolver);

call($client, 'http://blog.wyrihaximus.net/');
call($client, 'http://reactphp.org/');

$loop->run();
```

<script type="text/javascript" src="https://asciinema.org/a/4z81v21gkn9fxif2zorauq229.js" id="asciicast-4z81v21gkn9fxif2zorauq229" async></script>

##### Stream the response body #####

While in the previous examples the body was streamed in and echoed back to our screen it didn't make it very clear that is was streaming due to the small page size. This example makes use of [XS4ALL's](https://www.xs4all.nl/) download [test server](http://download.xs4all.nl/test/) downloading a 100MiB file. The example prints out how much of the 100MiB has been downloaded and shows the speed of the download once it has completed.

```php
<?php

echo PHP_EOL;

require 'vendor/autoload.php';

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);

$factory = new React\HttpClient\Factory();
$client = $factory->create($loop, $dnsResolver);

$size = 0;
$request = $client->request('GET', 'http://download.xs4all.nl/test/100MiB.bin');
$request->on('response', function ($response) use (&$size) {
    $response->on('data', function ($data, $response) use (&$size) {
        $size += strlen($data);
        echo "\033[1A", 'Downloaded size: ',  number_format($size / 1024 / 1024, 2, '.', ''), 'MB', PHP_EOL;
    });
});
$request->end();

$start = time();
$loop->run();
$end = time();

$duration = $end - $start;

echo round($size / 1024 / 1024, 2), 'MB downloaded in ', $duration, ' seconds at ', round(($size / $duration) / 1024 / 1024, 2), 'MB/s', PHP_EOL;
```

<script type="text/javascript" src="https://asciinema.org/a/agyf926d7jrhf8dpxxmcehw37.js" id="asciicast-agyf926d7jrhf8dpxxmcehw37" async></script>
<sub>(This is the biggest file I could download without going over the asciinema recording size limit.)</sub>

##### Community chosen example #####

On sunday I tweeted a question which of two extra examples to add to this post. The result was very clear that you wanted to see: A streaming Twitter example:

<blockquote class="twitter-tweet" lang="en"><p lang="en" dir="ltr">Got next Tuesdays <a href="https://twitter.com/reactphp">@ReactPHP</a> blog post nearly ready but want to add one more example. Which do you prefer? (Or both.)</p>&mdash; ln -s /dev/null / (@WyriHaximus) <a href="https://twitter.com/WyriHaximus/status/660930562203500544">November 1, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

But instead of just the Twitter example it does both, it streams my tweets in and detects when I tweet a link to RIPE's Atlas website and fetches extra information about the mentioned link through the REST API:
 
```php
<?php

require 'vendor/autoload.php';

const TWITTER_USER_ID = -1; // Use http://gettwitterid.com/ to get the wanted twitter ID
const CONSUMER_KEY = '';
const CONSUMER_SECRET = '';
const TOKEN = '';
const TOKEN_SECRET = '';

function generateHeader($method, $url, $params = null) {
    $consumer = new JacobKiers\OAuth\Consumer\Consumer(CONSUMER_KEY, CONSUMER_SECRET);
    $token = new JacobKiers\OAuth\Token\Token(TOKEN, TOKEN_SECRET);
    $oauthRequest = JacobKiers\OAuth\Request\Request::fromConsumerAndToken($consumer, $token, $method, $url, $params);
    $oauthRequest->signRequest(new JacobKiers\OAuth\SignatureMethod\HmacSha1(), $consumer, $token);
    return trim(substr($oauthRequest->toHeader(), 15));
}

function handleTweet($client, $tweet) {
    if (isset($tweet->user->screen_name)) {
        echo $tweet->user->screen_name, ': ', $tweet->text, PHP_EOL;
        if (trim($tweet->text) == 'exit();') {
            echo 'exit(); found, stopping...', PHP_EOL;
            die();
        }
        foreach ($tweet->entities->urls as $url) {
            if (substr($url->expanded_url, 0, 36) == 'https://atlas.ripe.net/measurements/') {
                getMeasurement($client, trim(substr($url->expanded_url, 36), '/'));
            }
            if (substr($url->expanded_url, 0, 30) == 'https://atlas.ripe.net/probes/') {
                getProbe($client, trim(substr($url->expanded_url, 30), '/'));
            }
        }
    }
}

function getMeasurement($client, $id) {
    $request = $client->request('GET', 'https://atlas.ripe.net/api/v1/measurement/' . $id . '/');
    $request->on('response', function($response) {
        $buffer = '';
        $response->on('data', function($data) use (&$buffer) {
            $buffer .= $data;
        });
        $response->on('end', function () use (&$buffer) {
            $json = json_decode($buffer);
            echo 'Measurement #', $json->msm_id, ' "', $json->description, '" had ', $json->participant_count, ' nodes involved', PHP_EOL;
        });
    });
    $request->end();
}

function getProbe($client, $id) {
    $request = $client->request('GET', 'https://atlas.ripe.net/api/v1/probe/' . $id . '/');
    $request->on('response', function($response) {
        $buffer = '';
        $response->on('data', function($data) use (&$buffer) {
            $buffer .= $data;
        });
        $response->on('end', function () use (&$buffer) {
            $json = json_decode($buffer);
            echo 'Probe #', $json->id, ' connected since ' . date('r', $json->status_since), PHP_EOL;
        });
    });
    $request->end();
}

$loop = React\EventLoop\Factory::create();

$dnsResolverFactory = new React\Dns\Resolver\Factory();
$dnsResolver = $dnsResolverFactory->createCached('8.8.8.8', $loop);

$factory = new React\HttpClient\Factory();
$client = $factory->create($loop, $dnsResolver);

$postData = 'follow=' . TWITTER_USER_ID;

$method = 'POST';
$url = 'https://stream.twitter.com/1.1/statuses/filter.json';
$headers = [
    'Authorization' => generateHeader($method, $url, [
        'follow' => TWITTER_USER_ID,
    ]),
    'Content-Type' =>  'application/x-www-form-urlencoded',
    'Content-Length' => strlen($postData),
];
$buffer = '';
$request = $client->request($method, $url, $headers, '1.1');
$request->on('response', function($response) use (&$buffer, $client) {
    echo 'Connected to twitter, listening in on stream:', PHP_EOL;
    $response->on('data', function($data) use (&$buffer, $client) {
        $buffer .= $data;
        if (strpos($buffer, PHP_EOL) !== false) {
            $tweets = explode(PHP_EOL, $buffer);
            $buffer = array_pop($tweets);
            foreach ($tweets as $tweet) {
                if (strlen(trim($tweet)) > 0) {
                    handleTweet($client, json_decode($tweet));
                }
            }
        }
    });
});
$request->end($postData);

$loop->run();
```
<script type="text/javascript" src="https://asciinema.org/a/eq4z6045onx5rs3lx6fwl1uqg.js" id="asciicast-eq4z6045onx5rs3lx6fwl1uqg" async></script>

The first in four tweets:
<blockquote class="twitter-tweet" lang="en"><p lang="en" dir="ltr">Atlas measurements are awesome, checking the ping to a server/IP/hostname in a few mouse clicks: <a href="https://t.co/iTTiCzoC2b">https://t.co/iTTiCzoC2b</a></p>&mdash; ln -s /dev/null / (@WyriHaximus) <a href="https://twitter.com/WyriHaximus/status/661903942469586944">November 4, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

There is however one side note with the twitter stream, [`react/http-client`](https://github.com/reactphp/http-client) doesn't support chunked encoding yet so don't expect the stream to be error free just yet.

##### Community examples #####

This week's community examples are [Christian Lück's](https://twitter.com/another_clue)&nbsp;[Buzz HTTP client](https://github.com/clue/php-buzz-react) and my own Guzzle adapters.

##### clue/buzz-react && soap-react #####

[Christian Lück's](https://twitter.com/another_clue)&nbsp;[Buzz HTTP client](https://github.com/clue/php-buzz-react) turns [`react/http-client`](https://github.com/reactphp/http-client) event focused API into into a [promise](/2015/02/reactphp-promises) based API:
 
```php
<?php
$loop = React\EventLoop\Factory::create();
$client = new Browser($loop);

$client->get('http://www.example.com/')->then(function (Response $result) {
    var_dump($result->getHeaders(), $result->getBody());
});

$loop->run();
```

Build on top of [`buzz-react`]() is [`soap-react`](https://github.com/clue/php-soap-react) a [`SOAP`](https://en.wikipedia.org/wiki/SOAP) client:

```php
$factory = new Factory($loop);
$wsdl = 'http://example.com/demo.wsdl';

$factory->createClient($wsdl)->then(function (Client $client) {
    $api = new Proxy($client);

    $api->getBank(array('blz' => '12070000'))->then(function ($result) {
        var_dump('Result', $result);
    });
});
```

##### wyrihaximus/react-guzzle(-ring|-psr7) #####

My own Guzzle adapters bring the asynchronous of ReactPHP to Guzzle [4](https://github.com/wyrihaximus/reactguzzle), [5](https://github.com/WyriHaximus/ReactGuzzleRing), and [6](https://github.com/WyriHaximus/react-guzzle-psr7). What initially started out as hack to do async with Guzzle turned into four packages (3 adapters/handlers and [1 meta package](https://github.com/WyriHaximus/react-guzzle-http-client) doing the actual work).

Guzzle 4:
```php
$client = new Client([
    'adapter' => new HttpClientAdapter($loop),
]);
$client->get('http://docs.guzzlephp.org/en/latest/')->then();
```
<sub>[Full example](https://github.com/wyrihaximus/reactguzzle#basic-usage)</sub>

Guzzle 5:
```php
$client = new \GuzzleHttp\Client([
    'handler' => new \WyriHaximus\React\RingPHP\HttpClientAdapter($loop),
]);
$client->get('https://github.com/', [ // This will redirect to https://github.com/
    'future' => true,
])->then();

```
<sub>[Full example](https://github.com/WyriHaximus/ReactGuzzleRing#example)</sub>

Guzzle 6:
```php
$handler = new \WyriHaximus\React\GuzzlePsr7\HttpClientAdapter($loop);

$client = new \GuzzleHttp\Client([
    'handler' => \GuzzleHttp\HandlerStack::create($handler),
]);

$client->getAsync('https://github.com/')->then();
```
<sub>[Full example](https://github.com/WyriHaximus/react-guzzle-psr7#examples)</sub>

##### Examples #####

[All the examples from this post can be found on Github.](https://github.com/WyriHaximus/ReactBlogSeriesExamples/tree/master/http-client)

##### Conclusion #####

[`react/http-client`](https://github.com/reactphp/http-client) makes a simple yet powerful component for sending out HTTP requests. While it might look a bit clunky on the outside with it's nested event listeners those becomes really powerful because you can pipe data from and to others streams into requests and from response. For example downloading a file and directly saving it to the [filesystem](/2015/03/reactphp-filesystem).
