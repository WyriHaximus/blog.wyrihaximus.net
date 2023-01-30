---
layout: post
title: "Migrating from self-hosted in Kubernetes Databases to managed hosted at Digital Ocean or the story of how I started working on Opportunistic TLS in ReactPHP"
date: 2023-01-01 13:37dw
comments: true
categories:
- Kubernetes
- DigitalOcean
- ReactPHP
- PHP
tags:
- Kubernetes
- DigitalOcean2
- MySQL
- PostgreSQL
- Redis
- ReactPHP
- PHP
social:
  image_relative: /images/posts/do-postgresl-hosted-throughput-graph.png
---


One of the things I’ve been planning for months, is to move my self-hosted [`Redis`](https://redis.io/), [`PostgreSQL`](https://www.postgresql.org/), and [`MySQL`](https://www.mysql.com/) servers from hosting it inside my [`Kubernetes`](https://kubernetes.io/) cluster to managed hosted at [`DigitalOcean`](https://m.do.co/c/7493728c79e4). 
At $15 each, I would have to save at least $45 on [`Kubernetes`](https://kubernetes.io/) cluster resources (nodes and volumes) by moving them. In the end, I succeeded at that and probably will end up saving even more as I’m 
moving some [`Prometheus`](https://prometheus.io/) exporters for certain things into my home [`Kubernetes`](https://kubernetes.io/) cluster. (Less expensive per month to run and not super important to have a high uptime/availability, to be honest.) Plus I’ve 
been cutting down on services. On the plus side it comes with shiny graphs to look inside how the managed databases are doing

![DigitalOcean Hosted PostgreSQL Throughput graph](/images/posts/do-postgresl-hosted-throughput-graph.png)

<!-- More -->

But all of that isn’t why I include this in my update. [`DigitalOcean`](https://m.do.co/c/7493728c79e4) requires [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) when connecting to their managed databases. Something that works out of the box for all of the things I’ve been running, 
except for those powered by [`ReactPHP`](https://reactphp.org/) and use [`PostgreSQL`](https://www.postgresql.org/). For that, at the low level, I use [`voryx/pgasync`](https://github.com/voryx/PgAsync) to connect to it. And it doesn’t support [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) out of the box, which I initially 
thought as well until I started looking into why. The wire protocol for [`PostgreSQL`](https://www.postgresql.org/) uses `Opportunistic TLS` when you required a secure connection. Unless all other services, I’ve worked with so far either 
use [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) from the start or stay plain text. [`PostgreSQL`](https://www.postgresql.org/) is different however, it requires you to upgrade the plain text connection to a [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) encrypted connection. Something we don’t support yet in [`ReactPHP`](https://reactphp.org/), 
we either do plain text or [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) from the start.

This is where I had to make a call, a) abort and figure out all of this later, or b) figure out all of this now within a reasonable timeframe or fall back to a). It turned out to be b) as two hours into 
all of this I figured out why my `tls://` URL wasn’t connecting and how to [`PostgreSQL`](https://www.postgresql.org/) wire protocol handles this. After diving into [`ReactPHP`](https://reactphp.org/)’s socket component to see how big of an effort this would be I 
decided to MVP is in a low traffic project, just the bare bones to make it work and proof the idea before creating PR’s for it. The initial version was passing flags all around like there is no tomorrow, 
and it wasn’t anything close to what it is now, but it worked.

After that, I started iterating over the code to make it robust and easy to use without having to pass around all the flags. Resulting in this PR: [reactphp/socket#302](https://github.com/reactphp/socket/pull/302)

Just as the initial [`react/socket`](https://reactphp.org/socket/), the initial pgasync implementation was also very naive and assumed you always wanted to encrypt the connection after connecting. After getting a few iterations in I got to 
the point where my specific use case was fully covered. But I didn't have support for all the [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) modes yet. My initial thought was This can't be that hard right?, well it is a fun challenge that can’t be 
resolved with a few flags in one location.

Of all the modes disable was the quickest to implement, when that mode is used don’t try to upgrade the connection to [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security). All the other modes (`allow`, `prefer`, `require`, `verify-ca`, and `verify-full`) will try to 
upgrade with various different [`TLS`](https://en.wikipedia.org/wiki/Transport_Layer_Security) stream flags depending on the mode. And that is where I’m currently at with [that PR](https://github.com/voryx/PgAsync/pull/52), figuring out which flags go with which mode.
