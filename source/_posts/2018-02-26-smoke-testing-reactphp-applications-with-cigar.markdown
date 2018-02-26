---
layout: post
title: "Smoke testing ReactPHP applications with Cigar"
date: 2018-02-26 13:37dw
comments: true
categories:
- PHP
- Bash
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- PHP
- Bash
social:
  image_relative: /images/posts/cigar.ash.png
---

Last week I came across [`Cigar`](https://github.com/Brunty/cigar), a smoke testing tool by [`Matt Brunt`](https://twitter.com/Brunty). 
Which, to me, is great stepping stone for my personal projects/sites to integration tests. In this post we not only go into Cigar, but 
also how to start your [`HTTP ReactPHP`](https://reactphp.org/http/) application, run cigar against it, and shut it down again. (Note 
that it doesn't have to be a ReactPHP application it can also be a NodeJS app, or PHP's build in webserver you use for testing.) 

<!-- More -->

# Setting up Cigar

First we need to install Cigar:

````bash
composer require brunty/cigar --dev
````

Secondly we create `.cigar.json` which contains a list of URL's, their expected status code, and optionally a chunk of the expected 
content. The list shown below is from one of my older sites/projects [`wow-screenshots.net`](https://www.wow-screenshots.net) I've 
converted to fully run on ReactPHP the past month:

```json
[
  {
    "url": "http://localhost:20080/",
    "status": 200
  },
  {
    "url": "http://localhost:20080/404",
    "status": 404
  },
  {
    "url": "http://localhost:20080/favicon.ico",
    "status": 200
  },
  {
    "url": "http://localhost:20080/robots.txt",
    "status": 200,
    "content": "User-agent"
  }
]
```

You might have noticed that we call the server on a very specific local IP and port combination, this is the address the server 
runs at on development and CI. Now normally we would start our server run `./vendor/bin/cigar` and get results:

![Cigar output](/images/posts/cigar.ash.png)

# All in one script

But we want to do all of that in one step. So we're going to craft a bash script that, in-order, starts the ReactPHP 
application, runs cigar, and then kills the ReactPHP application. Most of that is straight forward but we need to capture 
the PID (short for process identifier) so we can kill it later. But first we need a skeleton for our `cigar.ash` bash 
script.

```bash
#!/bin/bash

function main() {
}

main
``` 

1) We add the first line to `main()` that will start our server and launch it into the background using `&`. `web.php` is 
a simple HTTP server like [this ReactPHP HTTP Server example](https://github.com/reactphp/http/blob/master/examples/01-hello-world.php):
```bash
php ./server.php &
```

2) Next we add the following line which will capture the `PID` of our server:
```bash
local pid=$!
```

3) Optionally we'll wait for a few seconds to give the server time to start:
```bash
sleep 5
```

4) Now for the main attraction of this script, we run Cigar:
```bash
./vendor/bin/cigar
```

5) As bonus we capture Cigar's exit code and store it for later use:
```bash
local ec=$?
```

6) We shut down the application, rather aggressively using `-9` which kills it without giving it the change to clean up:
```bash
kill -9 $pid
```

7) And finally we re-emit the Cigar exit code:
```bash
exit $ec
```

# The end result

All of the above combined is the `cigar.ash` script I run do my smoke testing:

```bash
#!/bin/bash

function main() {
    php ./server.php &
    local pid=$!
    sleep 5
    ./vendor/bin/cigar
    local ec=$?
    kill -9 $pid
    exit $ec
}

main
```
