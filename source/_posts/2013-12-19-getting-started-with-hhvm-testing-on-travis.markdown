---
layout: post
title: "Getting started with HHVM testing on Travis CI"
date: 2013-12-19 17:28
comments: true
categories: 
- Travis CI
- HipHop VM
- Testing
- PHP
---

The good people over at [Travis CI added HipHopVM](http://about.travis-ci.org/blog/2013-12-16-test-php-code-with-the-hiphop-vm/) support to their build VM’s. Allowing you to test how your code runs in [Facebook’s PHP VM](https://github.com/facebook/hhvm). While HHVM might not be ready for prime time usage for all of us, in my opinion it is a good thing to start testing against it and see how it performs.

![Test matrix with HHVM build succeeding](/images/posts/MDHk7kM.png)

<!-- More -->

### HHVM testing  ###

Thus making it as easy as adding a new entry in your `.travis.yml` to start testing against it. To get started add `hhvm` as version to the `php` list:

~~~yaml
php:
  - 5.4
  - 5.5
  - hhvm
~~~

### allow_failures ###

That tells Travis to run a build with HHVM instead of PHP. Now depending on what your package is doing your test will just run fine or crash due to incompatibility between PHP and HHVM. This will break your build. That is why I added it to my allowed failures for now. You can add it to `allow_failures` by adding this into your `.travis.yml`:

~~~yaml
matrix:
  allow_failures:
    - php: hhvm
~~~

### Conclusion ###

HHVM is a very promising project and support for it on Travis allows us to testing it without getting our hands to dirty just yet. We can just sit back and see it evolve by peeking at our test results. How ever there are still a few issues to work out like [#1363](https://github.com/facebook/hhvm/issues/1363). The team behind it did an amazing job this far and looking at [some commits](https://github.com/facebook/hhvm/commit/00ca68a71514ff3fddc89e2e8be1847893ac161d) over the past few days, more goodness is to come.
