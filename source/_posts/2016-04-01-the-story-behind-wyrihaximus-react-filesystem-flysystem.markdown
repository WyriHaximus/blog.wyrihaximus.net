---
layout: post
title: "The story behind wyrihaximus/react-filesystem-flysystem"
date: 2016-04-01 21:12dw
comments: true
categories:
- PHP
- ReactPHP
- Filesystem
tags:
- PHP
- Flysystem
- ReactPHP
- Filesystem
- Child Processes
---

Ever since [Frank de Jonge](https://twitter.com/frankdejonge) created [`Flysystem`](http://flysystem.thephpleague.com/) there have been [questions about it supporting async](https://github.com/thephpleague/flysystem/issues/198). While I've initially said no here is the story how it happened anyway.

<!-- More -->

##### react/filesystem #####

During my work on [`react/filesystem`](https://github.com/reactphp/filesystem) one thing was every clear, only building on `EIO` was very limiting the possible reachable user base. Since creating a blocking adapter is out of the question the only way would be another extension adapter or using child processes to pool. At the time I was also looking into using child processes for async database access. Not that isn't directly the best way to go but more of an intrem solution. The devs at [`Voryx`](http://voryx.net/) made an true async [https://github.com/voryx/PgAsync](PostGres package) which is the way to go.

##### wyrihaximus/react-child-process-messenger #####

When I first set out to build [`wyrihaximus/react-child-process-pool`](https://github.com/WyriHaximus/reactphp-child-process-pool) I quickly realised I had to split it up in two packages, one for the pooling and one for the communication with a single child process. The latter became [`wyrihaximus/react-child-process-messenger`](https://github.com/WyriHaximus/reactphp-child-process-messenger).

##### wyrihaximus/react-child-process-pool #####

The pooling package makes it possible to run a call on the first available child process in the pool, and with the messenger taking care of all the communication the pool does just pooling. But there was something missing, what if you run CPU heavy? The way operating systems work your process gets assigned a CPU core to work on. Now that isn't ideal, you might end up with 5 processes on the same core. Thus [`wyrihaximus/cpu-core-detector`](https://github.com/WyriHaximus/php-cpu-core-detector) was born to find out the number of CPU cores and get the right command to assign a process to a core. This way the pool just gets the ammount of cores and starts the processes based on how many cores are on the box.

##### wyrihaximus/cpu-core-detector #####

Now the CPU core detector had a lot of WET code in it. Starting a process, capturing output, and parsing it. And so [`wyrihaximus/react-child-process-promise`](https://github.com/WyriHaximus/reactphp-child-process-promise) became another package. Doing nothing more then launching a process, capturing it's output and returning that through a promise.

##### wyrihaximus/react-filesystem-flysystem #####

Now that I have all of this created for [`react/filesystem`](https://github.com/reactphp/filesystem) and some of my other projects. The thought came to try out how much work it was to run `Flysystem` inside a child process. That actually ran pretty well. Decided to try it out against [TransIP's STACK](https://www.transip.nl/stack/) (1TB free storage, NL only). And within a couple of hours I had a working adapter that could up and download from STACK. It might not be the wisest idea to do, but it was fun and work rather well and should be seen as an intrem solution untill we have fully functional async adapters for all filesystems flysystem supports.

##### TL;DR #####

I've been busy
