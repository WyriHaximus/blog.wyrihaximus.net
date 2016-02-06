---
layout: post
title: "Moving From WordPress to Octopress"
date: 2013-05-19 01:48
comments: true
categories: 
- Wordpress
- Octopress
tags:
- Wordpress
- Octopress
- migrations
- git
---

WordPress has become an increasingly uninteresting platform to blog on. recently I've fallen in love with the simplicity and robustness of markdown files. Though WordPress has several plugins doing markdown [@Ceeram](https://twitter.com/Ceeram) and [@kvz](https://twitter.com/kvz) pointed me to [Octopress](http://octopress.org/). It builds on the simplicity of markdown files and utilizing Jekyll creating a rocksolid blogging platform. (Heck Github uses it for github pages so it can't be wrong!)
<!-- More -->
## Pros ##

- Static files, no wasted CPU clycles for something that doesn't change often.
- CDN ready
- Easy extensible with either existing plugins or building your own

## Cons ##

- Setting it up requires more time and especially my setup (private git repo's deploying it to AWS S3 serving it over AWS CloudFront). 
- Not that many plugins compared to WordPress, there is a [3rd party plugin list](https://github.com/imathis/octopress/wiki/3rd-party-plugins) on Github.

## Conclusion ##

Overall I'm happy with the migration. It's become simpler, interesting and fun to blog again. Will post some followup posts describing certain details I couldn't find on the net.
