---
layout: post
title: "ReactPHP: Introduction"
date: 2015-01-06 13:37
comments: true
categories:
- PHP
- ReactPHP
- ReactPHP Series
tags:
- ReactPHP
- PHP
---

ReactPHP brings the concept of asynchronous I/O, as seen in NodeJS and others, to PHP. For many PHP developers this requires a completely different mindset then your average page handling request or CLI command. In this series we'll explore the different bits and components that make up ReactPHP. From the mid-level packages such as [`react/http-client`](https://github.com/reactphp/http-client) all the way down to to it's core: [`react/event-loop`](https://github.com/reactphp/event-loop).

![ReactPHP](/images/posts/68747470733a2f2f7261772e6769746875622e636f6d2f72656163747068702f676966736f636b65742f6d61737465722f646f632f72656163742e706e67.png)![Mind blown](/images/posts/68747470733a2f2f7261772e6769746875622e636f6d2f72656163747068702f676966736f636b65742f6d61737465722f646f632f6d79627261696e2e676966.gif)

<!-- More -->

Throughout this series I’ll take a new topic each post and build something very tiny explaining how it works and can be used. Plus giving at least one community package example that uses the topic of the post.

The topics, in random order:

* [Timers](/2015/01/reactphp-timers/)
* [Promises](/2015/02/reactphp-promises/)
* [Ticks](/2015/02/reactphp-ticks/)
* [Streams](/2015/02/reactphp-streams)
* [Event loop](/2015/02/reactphp-event-loop)
* [Sockets](/2015/03/reactphp-sockets)
* [Socket clients](/2015/03/reactphp-socket-clients)
* [Child Process](/2015/03/reactphp-child-processes)
* [Filesystem](/2015/03/reactphp-filesystem)

Starting the 27th of January I'll start posting each week on Tuesday.

P.S. Can't wait and want to see what you can build? Check out [see what other developers are building on ReactPHP](https://github.com/reactphp/react/wiki/Users).