---
layout: post
title: "How Xdebug made HHVM look super awesome"
date: 2014-03-03 15:27
comments: true
categories:
- HotSpots
- HipHop VM
- Xdebug
- Travis CI
- Testing
---

Two weeks ago I tweeted about `HHVM` beeing a lot faster then standard PHP on a certain set of `Travis CI` builds. No matter how awesome that tweet looked, the timings it showed are influenced and accurate. Let me tell you why.

<blockquote class="twitter-tweet" lang="en"><p>So <a href="https://twitter.com/HipHopVM">@HipHopVM</a> is said to be fast but this difference is just ridiculous. (Testing operations on images.) <a href="http://t.co/3HO3dSB9IZ">pic.twitter.com/3HO3dSB9IZ</a></p>&mdash; Cees-Jan Kiewiet (@WyriHaximus) <a href="https://twitter.com/WyriHaximus/statuses/435712975622504448">February 18, 2014</a></blockquote>

<!-- More -->

### What happened ###

In my effort to get a full year of daily contributions on Github I was going over my repo's nitpicking something simple to do that day. Found that the `.travis.yml` of [HotSpots](https://github.com/WyriHaximus/HotSpots) could use some white space between sections. Used Github's fancy webbased editor since it was a quick fix. Committed and decided to check out the test results:

![Travis CI WyriHaximus/HotSpots build #45](/images/posts/Bgv2pJCCAAANJZ8.png)

The difference between `vanilla` PHP and `HHVM` is huge. Looking at the tests them self it's [8 seconds](https://travis-ci.org/WyriHaximus/HotSpots/jobs/19098214#L88) on `HHVM` versus [2 minutes](https://travis-ci.org/WyriHaximus/HotSpots/jobs/19098213#L88) on `vanilla`. How awesome that result may look it's not realistic. So lets find out what happened.

### How is is set up ###

First off I've setup the github the repo with a commit hook to travis and it includes an `.travis.yml` file with the testing configuration for Travis. It includes the following PHP versions to test against:

~~~yml
  - 5.3
  - 5.4
  - 5.5
  - 5.6
  - hhvm
~~~

The `script` directive is the following:

~~~bash
php vendor/bin/phpunit --coverage-text --coverage-clover ./build/logs/clover.xml
~~~

And the after script, will be important later on, is this:

~~~bash
php vendor/bin/coveralls
~~~

### Getting the hint ###

Two days after the tweet I get this response to it.

<blockquote class="twitter-tweet" lang="en"><p><a href="https://twitter.com/WyriHaximus">@WyriHaximus</a> Noob question: why does job 45.5 ends with a InvalidConfigurationException &quot;json_path is not writable&quot; where others don&#39;t?</p>&mdash; DUVERGIER Claude (@C_Duv) <a href="https://twitter.com/C_Duv/statuses/436453529159753728">February 20, 2014</a></blockquote>

Hinting there is something wrong. Checking build [#45.5 line #97](https://travis-ci.org/WyriHaximus/HotSpots/jobs/19098214#L97) and no surprise it's there. 

### What was causing it ###

With that hint I started looking around and realized it must have been because the `clover.xml test` coverage file was missing. Then it starting to make sense, `HHVM` doesn't support `Xdebug` so there is no code coverage collected, just test results. Knowing that `Xdebug` slows things down tremendously when doing code coverage, it could explain the difference. Normally it's barely noticeable but due to the huge amount of asserts (going over the resulting image pixel by pixel) it stands out. To be sure, and find out the real performance gap, a simple VM using vagrant was set up with `HHVM` and `vanilla` PHP install.

### The Accurate results ###

The end result isn't as spectacular as my initial screenshot. But it does confirm my suspicion that `Xdebug` slowed the tests down on `Travis`. Both are run with repeat on 100 to get a decent timing difference. But it does show `HHVM` still as a clear winner.

#### PHP ###

~~~bash
php vendor/bin/phpunit --repeat 100
~~~
Resulted in:

![PHP Results](/images/posts/2014-02-26-how-xdebug-made-hhvm-look-super-awesome/php-hotspots-bare.png)

#### HHVM ####

~~~bash
hhvm vendor/bin/phpunit --repeat 100
~~~

Resulted in:

![HHVM Results](/images/posts/2014-02-26-how-xdebug-made-hhvm-look-super-awesome/hhvm-hotspots-bare.png)

### Conclusion ###

My initial tweet was sent out because I was surprised by the huge timing discrepancy. The community responded in was great way. And I hope no one has the wrong impression about `HHVM` vs. `PHP` performance due to that tweet. `HHVM` is still the clear winner, completing the tests a good 10% faster. This `oopsie` has been a valuable lesson for me to always properly check my facts. Would like to thank [Claude](http://twitter.com/C_Duv) for pointing me in the right direction. 