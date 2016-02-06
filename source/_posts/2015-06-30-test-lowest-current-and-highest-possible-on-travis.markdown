---
layout: post
title: "Test lowest, current, and highest possible on Travis"
date: 2015-06-30 21:30dw
comments: true
categories:
- PHP
- TravisCI
- TravisCI Series
tags:
- PHP
- TravisCI
social:
  image_relative: /images/posts/logo-composer-travis-transparent.png
---

During DPC I've had a talk with [Rafael](https://twitter.com/rdohms) about making sure you test all your possible versions, lowest, current, and highest. The talk was ignited by the infamous `composer.lock` file (whether to commit it or not). 

![Composer Travis Hybrid](/images/posts/logo-composer-travis-transparent.png)

<!-- More -->

##### The setup #####

Setting travis up to test against those 3 targets is rather easy. As usual you add each PHP version to the php array. The first twist is that for each version you add a highest and lowest `dependencies` environment var to the build matrix as such: 

```yml
- php: 5.6
  env: dependencies=lowest
- php: 5.6
  env: dependencies=highest
```

We can use that variable (or it's absence) to determine what composer command to run. For the default job we check if `$dependencies` is not set and then run `composer install`:

```bash
if [ -z "$dependencies" ]; then composer install; fi;
```

For the lowest we check if `$dependencies` is set to `lowest` and then run `composer update --prefer-lowest`:

```bash
if [ "$dependencies" = "lowest" ]; then composer update --prefer-lowest -n; fi;
```

For the highest we check if `$dependencies` is set to `highest` and then run a regular `composer update`:

```bash
if [ "$dependencies" = "highest" ]; then composer update -n; fi;
```

The end result (I've left the actually running of test out to provide a minimal example):

```yml
language: php

php:
  - 5.6
  - 7

matrix:
  include:
    - php: 5.6
      env: dependencies=lowest
    - php: 7
      env: dependencies=lowest
    - php: 5.6
      env: dependencies=highest
    - php: 7
      env: dependencies=highest

before_script:
  - composer self-update -q
  - if [ -z "$dependencies" ]; then composer install; fi;
  - if [ "$dependencies" = "lowest" ]; then composer update --prefer-lowest -n; fi;
  - if [ "$dependencies" = "highest" ]; then composer update -n; fi;
```

##### The result on travis #####

After you updated your travis.yml you'll end up with a build matrix like this:

![Travis build matrix](/images/posts/U1KVpmT.png)

##### The after match #####

Now that we have the testing setup things are going to get interesting. In my case, most issues were from overly loose constraints in my `computer.json`. One example is a package targeted at `^1.0`, that resulted in errors and the correct targeting is `^1.0.6` due to a bugfix in `1.0.6`. You'll find similar issues and errors on your path but it will be worth it in the end as your package will work for your set constraints.

##### A side note #####

<blockquote class="twitter-tweet" data-conversation="none" lang="en"><p lang="en" dir="ltr"><a href="https://twitter.com/WyriHaximus">@WyriHaximus</a> nice sum up although I&#39;d maybe not do the high/low tests on all PHP versions. Don&#39;t forget Travis cpu time isn&#39;t unlimited :)</p>&mdash; Jordi Boggiano (@seldaek) <a href="https://twitter.com/seldaek/status/616000488878788608">June 30, 2015</a></blockquote>

[Jordi](https://twitter.com/seldaek) has a very valid point here. Travis has limited CPU time available and it shows best during the evening hours when both the EU and US are active. I'm not surprised anymore by builds waiting up to an hour to start. If you're a small package maintainer like me that doesn't makes a lot of commits (and thus builds) or doesn't support a lot of PHP versions limiting the build matrix might not have a big import. But that doesn't make the following suggestion less interesting. Test highest and lower only for hhvm, PHP7, and your lowest and highest PHP5.x version (5.3 and 5.6 for example). That way you ensure lowest and highest work most likely with all your supported PHP versions. (The change something breaking between those 5.x versions you didn't test is rather nihil.)
