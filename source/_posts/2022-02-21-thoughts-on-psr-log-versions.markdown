---
layout: post
title: "Thoughts on psr/log versions"
date: 2022-02-21 13:37dw
comments: true
categories:
- PHP
- PSR-3
- Short
tags:
- logging
---

One of the things that came up while upgrading packages is PSR-3's new v2 and v3 releases. They add type hints to 
methods and return type hints. For packages implementing this means that they can't support all 3 versions. For 
packages only consuming `psr/log` all 3 versions can be used as you don't have to build classes on them.

However, for packages implementing PSR-3 this suddenly became more complex. All of a sudden you need 3 major versions 
if you want to support all PSR-3 versions. For a package that only implements PSR-3 this isn't so much of an issue, but 
when the implementation is embedded inside another package you all of a sudden reach dependency hell. And one thing I 
learned while upgrading my packages is how deep our dependency on `psr/log` goes these days.

The mistake I've made with at least one PR in the past few weeks is miss that a consumer of `psr/log` is also an 
implementer, and I missed that. So now I get to get back and make a new PR resolving that mess I introduced.