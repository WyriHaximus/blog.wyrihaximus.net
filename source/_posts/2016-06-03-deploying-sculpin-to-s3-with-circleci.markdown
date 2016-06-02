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
---

Untill 10 minutes before the start of this month I had a [VPS at Digital Ocean](https://m.do.co/c/7493728c79e4) running with [Jenkins](https://jenkins.io/) and [Git](http://gitolite.com/) on it for privately hosted repositories. [With Github's recent move to unlimited repositories](https://github.com/blog/2164-introducing-unlimited-private-repositories) I realy didn't have a need to host them myself anymore, and after playing with [CircleCI](https://circleci.com/) it didn't make any sense anymore to keep that VPS up.

<!-- More -->
