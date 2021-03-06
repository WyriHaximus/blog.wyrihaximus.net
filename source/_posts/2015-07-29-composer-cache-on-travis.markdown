---
layout: post
title: "Composer cache on Travis"
date: 2015-07-29 13:37dw
comments: true
categories:
- PHP
- Composer
- TravisCI
- TravisCI Series
tags:
- PHP
- Cache
- Composer
- TravisCI
social:
  image_relative: /images/posts/docker-travis-composer-packagist.png
---

Ever since the [Test lowest, current, and highest possible on Travis](/2015/06/test-lowest-current-and-highest-possible-on-travis/) post I wanted to dive into caching composers cache on Travis. My experiments started the day after that post. 

![Docker Composer Packagist Travis Hybrid](/images/posts/docker-travis-composer-packagist.png)

<!-- More -->

##### The setup #####

Travis has a [`cache` configuration directive](http://docs.travis-ci.com/user/caching/) that has support for caching entire directories. In our setup we'll cache composer's own cache directory, `$HOME/.composer/cache/files`,  where it stores dist downloads.

```yml
## Cache composer bits
cache:
  directories:
    - $HOME/.composer/cache/files
```

##### Caveats #####

While this generally will speed up your travis builds there are a few caveats

###### Cloning instead of downloading ######

One of the things that can happen, depending on your composer.(json|lock), is composer cloning repositories from `Github` instead of downloading distfiles. This results in storing the entire repository's into the travis cache. On very simple projects I've seen it go as high as nearly one gigabyte because of certain dev dependencies. While on other projects, that only pulled in dist files, it stays just under 50 megabyte. A way to suggestively force distfiles is the use of `--prefer-dist` when installing or updating.

###### Faulty cache ######

Sometimes when you're making major changes to your composer.json the cache still contains references to the old situation and can distort your test results. This might sound a bit foggy and it is, so a good rule of thumb here is to whenever you remove your local vendor directory you also clear the travis cache.

##### The result #####

The speed up results are worth the time setting this up. I've seen projects going from 50 second jobs to 10 seconds because everything is cached. When your doing the [lowest, current, and highest thing](/2015/06/test-lowest-current-and-highest-possible-on-travis/) you'll see slightly slower builds for lowest and highest because those are run though `composer update`. You can see the result of one of my packages below:

![Text matrix](/images/posts/v68AQj7.png)

##### Updates #####

* 6 February 2017 - Removed `sudo` references as cache is also up on container infrastructure as well and added `/files` to the path so only dist files are cached.
