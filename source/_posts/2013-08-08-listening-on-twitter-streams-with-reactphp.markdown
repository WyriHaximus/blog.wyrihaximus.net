---
layout: post
title: "Listening on Twitter streams with ReactPHP"
date: 2013-08-08 13:37
comments: true
categories: 
- Twitter
- ReactPHP
- Streams
- PHP
tags:
- PHP
- Streams
- ReactPHP
---

For a private project I needed twitter timeline widgets. Since twitter has dropped support for non-authenticated widgets I had to come up with something better. Something cooler and more sophisticated then a standard widget. But above all of those, only a twitter screen name should have to be specified. This is where ReactPHP comes in.
<!-- More -->

Note: This article is written for ReactPHP `0.3` and there for some code won't work directly with ReactPHP `0.4`.

## Meet the components ##

### ReactPHP ###

ReactPHP provides a node.js like asynchronous programming interface to PHP. If you never heard of it check out [the website](http://reactphp.org/ "ReactPHP website") and [this talk](http://www.youtube.com/watch?v=MWNcItWuKpI "Youtube view of ReactPHP Talk") to get up to speed. 

### Twitter ###

Before you can get started you'll need a twitter account and a twitter app, you can create and view them [here](https://dev.twitter.com/apps "Your twitter applications"). Once you created one make sure to generate your access token pair you'll be needing that later on. 

### jacobkiers/oauth ###

This package by [Jacob Kiers](https://github.com/jacobkiers "GitHub profile for Jacob Kiers") will fulfill a small but crucial role in this post. It generates the oAuth header for the twitter API. 

### composer.json ###

We'll start with a composer.json specifying out dependencies. We'll be using [oauth](https://packagist.org/packages/jacobkiers/oauth "jacobkiers/oauth package on packagist") by Jacob Kiers to generate the `Authorization` header. Together with [react's HttpClient](https://packagist.org/packages/react/http-client "react/http-client on packagist") handling all the data streaming.

~~~json
{
    "require": {
        "jacobkiers/oauth": "1.0.*",
        "react/http-client": "0.3.*"
    }
}
~~~

## Using the components ##

### HttpClient ###

ReactPHP comes with a neat little asynchronous http client. This comes in handy requesting multiple resources at the same time or using a streaming API. Consider the following code loading a small history for the given `$userId` (headers omitted keeping the example simple, you can read about those later):

~~~php
<?php
$buffer = '';
$request = $this->client->request('GET', 'https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=' . $userId);
$request->on('response', function($response) use (&$buffer) {
    $response->on('data', function($data) use (&$buffer) {
        $buffer .= $data;
    });
});
$request->on('end', function() use (&$buffer) {
    $tweets = json_decode($buffer);
    foreach ($tweets as $tweet) {
        $this->saveTweet($tweet);
    }
});
$request->end();
~~~

- Line `3`, `$this->client` is an instance of `React\HttpClient\Client`. Calling `request` on that object returns a new `React\HttpClient\Request` object to be used for this request.
- Line `4` starts listening for a response and when a response is in it will attach a listener on the response object for data on line `5`.
- Line `9` attaches a listener for the end of the request when the data is fully loaded saving the loaded tweets (line `11`).     

### OAuth header ###

As mentioned before we'll be using a library to generate the OAuth header. To generate the header there are a few things needed. First off we'll need the request method, URL and parameters to sign:

~~~php
<?php
$method = 'POST';
$url = 'https://stream.twitter.com/1.1/statuses/filter.json';
$params = array(
    'follow' => 11328822,
);
~~~

Secondly we'll setup consumer and token instances:

~~~php
<?php
$consumer = new JacobKiers\OAuth\Consumer\Consumer($this->oauth['consumer_key'], $this->oauth['consumer_secret']);
$token = new JacobKiers\OAuth\Token\Token($this->oauth['token'], $this->oauth['token_secret']);
~~~

Third well create an request and sign it:

~~~php
<?php
$oauthRequest = JacobKiers\OAuth\Request\Request::fromConsumerAndToken($consumer, $token, $method, $url, $params);
$oauthRequest->signRequest(new JacobKiers\OAuth\SignatureMethod\HmacSha1(), $consumer, $token);
~~~

Since we aren't using Jacobs lib to do the actual request the header has to be extracted:

~~~php
<?php
$signHeader = trim(substr($oauthRequest->toHeader(), 15));
~~~

Note that we substr and trim the result to extract the headers contents and discard the prepended header name. We create a convenience method to make it easy creating the header. We'll be using this header setup later on.
~~~php
<?php
private function generateHeader($method, $url, $params = null) {
	$consumer = new JacobKiers\OAuth\Consumer\Consumer($this->oauth['consumer_key'], $this->oauth['consumer_secret']);
	$token = new JacobKiers\OAuth\Token\Token($this->oauth['token'], $this->oauth['token_secret']);
	$oauthRequest = JacobKiers\OAuth\Request\Request::fromConsumerAndToken($consumer, $token, $method, $url, $params);
	$oauthRequest->signRequest(new JacobKiers\OAuth\SignatureMethod\HmacSha1(), $consumer, $token);
	return trim(substr($oauthRequest->toHeader(), 15));
}
~~~

### Streaming API ###

The streaming API code is slightly different compared the a normal call with the HttpClient as the `end` behaves differently (depending on your wishes) and the buffer is processed not just filled untill the request ends. (The following example only includes interaction with the buffer to illustrate how to handle the tweet stream).

~~~php
<?php
$request->on('response', function($response) use (&$buffer) {
    $response->on('data', function($data) use (&$buffer) {
        $buffer .= $data;
        if (strpos($buffer, PHP_EOL) !== false) {
            $tweets = explode(PHP_EOL, $buffer);
            $buffer = array_pop($tweets);
            foreach ($tweets as $tweet) {
                if (strlen(trim($tweet)) > 0) {
                    $this->handleChunk($tweet);
                }
            }
        }
    });
});
~~~

- Line `4` just keeps adding the data to the buffer same as the previous example.
- Line `5` checks for an `End Of Line` in the buffer, when found it tears the buffer apart on line `6`.
- Line `7` puts the last line with data in the array back into the buffer and starts to walk through all found tweets on line `8`.
- Because twitter sends empty lines on set intervals `$tweet` is trimmed and has it's length checked on line `9`.    
- Line `10`handles the object in the chunk. As it can not only contain a tweet, is can also contain a delete command or another message from the twitter service.

### sample.json ###

The sample endpoint gives a solid +/- 200KB/s tweet stream. Providing a decent amount of tweets to develop against.
![](/assets/postImages/reactPHPTwitterStreamingAPI/PHCD085.png)

Listening on the [sample.json](https://dev.twitter.com/docs/api/1.1/get/statuses/sample "sample.json documentation") is easy. It's basically a meshup between the HttpClient, OAuth header and Streaming API that looks like this:

~~~php
<?php
$method = 'GET';
$url = 'https://stream.twitter.com/1.1/statuses/sample.json';
$headers = array(
    'Authorization' => generateHeader($method, $url),
);
$buffer = '';
$request = $this->client->request($method, $url, $headers);
$request->on('response', function($response) use (&$buffer) {
    $response->on('data', function($data) use (&$buffer) {
        $buffer .= $data;
        if (strpos($buffer, PHP_EOL) !== false) {
            $tweets = explode(PHP_EOL, $buffer);
            $buffer = array_pop($tweets);
            foreach ($tweets as $tweet) {
                if (strlen(trim($tweet)) > 0) {
                    $this->handleChunk($tweet);
                }
            }
        }
    });
});
$request->end();
~~~

## Building the stream listener ##

### Lookup a user ID ###

Before we can get started and start listening on the stream with specific user(s) tweets we need to have their ID. Now we have their (or well mine and `ReactPHP`'s) screen names: `WyriHaximus` and `reactphp`.

~~~php
<?php
$screenNames = ['WyriHaximus', 'reactphp'];
$method = 'GET';
$url = 'https://api.twitter.com/1.1/users/lookup.json?user_id=' . implode(',', $screenNames);
$headers = array(
    'Authorization' => $this->generateHeader($method, $url),
    'Connection' => 'Close',
);
$buffer = '';
$userIds = array();
$request = $this->client->request($method, $url, $headers);
$request->on('response', function($response) use (&$buffer) {
    $response->on('data', function($data) use (&$buffer) {
        $buffer .= $data;
    });
});
$request->on('end', function() use (&$buffer, &$userIds) {
    $users = json_decode($buffer);
    foreach ($users as $user) {
        $userIds[] = $user->id_str;
    }
});
$request->end();
~~~

As in the first `HttpClient` example this block of code also waits for the full request to be returned. Once the request has finished it decodes the resulting JSON blob it loops through the users and stores their ID in an array we'll be using in the next section.  

### filter.json ###

This far we've only used `GET` requests for streams but `filter.json` requires a `POST` request.

~~~php
<?php
$postData = array();
$params = array(
    'follow' => implode(',', $ids),
);
foreach ($params as $name => $value) {
    $postData[] = $name . '=' . $value;
}

$method = 'POST';
$url = 'https://stream.twitter.com/1.1/statuses/filter.json';

$headers = array(
    'Authorization' => $this->generateHeader($method, $url, $params),
    'Content-Type' =>  'application/x-www-form-urlencoded',
    'Content-Length' => strlen(implode('&', $postData)),
);
$buffer = '';
$request = $this->client->request($method, $url, $headers);
$request->on('response', function($response) use (&$buffer) {
    $response->on('data', function($data) use (&$buffer) {
        $buffer .= $data;
        if (strpos($buffer, PHP_EOL) !== false) {
            $tweets = explode(PHP_EOL, $buffer);
            $buffer = array_pop($tweets);
            foreach ($tweets as $tweet) {
                if (strlen(trim($tweet)) > 0) {
                    $this->handleChunk($tweet);
                }
            }
        }
    });
});
$request->on('headers-written', function ($that) use ($postData) {
    $that->write(implode('&', $postData));
});
$request->end();
~~~

- Line `15` adds the `Content-Type` header required for a `POST` request to the headers.
- Line `16` adds the `Content-Length` header deriving the length from `$postData`.
- Line `34` listens on the `headers-written` which is fired directly after writing the headers. When firing it writes the post data to stream completing the `POST` request.

### Conclusion ###

Listening on twitter stream is just as simple are requesting and parsing a webfile with PHP. It requires a different, an asynchronous way of thinking about the process.  

### Bonus tips ###

- Make sure your system clock is correct, the streaming only allows you to be off for 5 minutes either way.
- When looking up a couple thousand user ID's you can't do that all at once. `\React\Promise\When::all` can help you sending out a couple of requests at the same time and wait untill all of them are completed. [Take this gist for example.](https://gist.github.com/WyriHaximus/b140dd7ed019b58c3e69 "gist:b140dd7ed019b58c3e69") It's older code that loads all unknown user ID's and waits for all of them being loaded before it continues listening on the stream. For more information about promises check [react/promise](https://github.com/reactphp/promise "react/promise on packagist") and [CommonJS Promises/A ](http://wiki.commonjs.org/wiki/Promises/A).      