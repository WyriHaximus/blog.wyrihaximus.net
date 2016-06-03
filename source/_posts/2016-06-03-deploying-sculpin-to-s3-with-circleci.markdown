---
layout: post
title: "Deploying Sculpin to S3 with CircleCI"
date: 2016-06-03 21:12dw
comments: true
categories:
- PHP
- Sculpin
- CircleCI
tags:
- PHP
- Sculpin
- CircleCI
- Deployment
social:
  image_relative: /images/posts/IQn4hLR.png
---

Untill 10 minutes before the start of this month I had a [VPS at Digital Ocean](https://m.do.co/c/7493728c79e4) running with [Jenkins](https://jenkins.io/) and [Gitolite](http://gitolite.com/) on it for privately hosted repositories. [With Github's recent move to unlimited repositories](https://github.com/blog/2164-introducing-unlimited-private-repositories) I realy didn't have a need to host them myself anymore, and after playing with [CircleCI](https://circleci.com/) it didn't make any sense anymore to keep that VPS up.


![Deployment](/images/posts/IQn4hLR.png)

<!-- More -->

Since porting git over to another [remote](https://help.github.com/articles/pushing-to-a-remote/) is as more Github's domain we're focussing on deploying [Sculpin](https://sculpin.io/) to [S3](https://aws.amazon.com/s3/) using [CircleCI](https://circleci.com/) in this post.

# Prerequisites

* A sculpin blog on Github, in my case that was simple because [I already put my blog on github](https://github.com/WyriHaximus/blog.wyrihaximus.net) a whole ago so others could send PR's
* A S3 bucket setup to use
* A special IAM User and it's keys just for this project and deploying with 
