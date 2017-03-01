---
layout: post
title: "Announcing: PHP API Clients"
date: 2016-12-14 13:31dw
comments: true
categories:
- PHP
- API
- ReactPHP
tags:
- PHP
- API
- ReactPHP
social:
  image_relative: /images/posts/php-api-clients-logo.png
---

For a while now I'm been working on a new huge project. Been tweeting about it for a while as welland since it is my birthday I like to give the [`PHP`](http://php.net/) community a "little" present. It is time to officially announce: [`PHP API Clients`](https://php-api-clients.org/). 

![PHP API Clients](/images/posts/php-api-clients-logo-960.png)

<!-- More -->

# Goals

* Community run, currently I'm working on getting everything started but I hope the project to be come a place for async first API clients beyond the ones I can personally use
* PHP `^7.0` packages
* Designed async first from the ground up using [`ReactPHP`](https://github.com/reactphp)
* Generated resources for ease of development
* Resources/Clients for sync and async
 * Sync resources/clients wrap Async resources/clients
 * Async resources/clients return [`promises`](https://github.com/reactphp/promise) when returning objects, or [`observables`](https://github.com/ReactiveX/RxPHP) when returning arrays

# Async first

One of the reason I started working on these clients is that there are none to barely any asynchronous API clients in [`PHP`](http://php.net/). 
And for the rebuild of my [site](https://wyrihaximus.net/) I want to integrate with [`Github`](https://github.com/), [`TravisCI`](https://travis-ci.org/), [`Twitter`](https://twitter.com/) both for easier mass project management and shiny gimmicks. 
(Like the [username emoji changer example](https://github.com/php-api-clients/twitter/blob/master/examples/profile-update-username-on-tweet-async.php) for the [`Twitter` client](https://php-api-clients.org/clients/twitter/) which puts a random [`emoji`](http://unicode.org/emoji/charts/full-emoji-list.html) in the given username. It is active right now on my twitter, every time I tweet a random [`emoji`](http://unicode.org/emoji/charts/full-emoji-list.html) is place between `Cees-Jan` and `Kiewiet`.)
In order for everything to be able to be full asynchronous and synchronous the clients have to be async first. 
That means as much that all synchronous clients don't do actual work, but instead use the asynchronous client in the respective package to do the heavy lifting.
This has a few advantages as there is a lot less duplicated code by using [`clue/block-react`](https://github.com/clue/php-block-react), by [`Christian Lück`](https://twitter.com/another_clue), to turn an async promise into a sync result that can be return as usual.
(In case you want to use the async client in a more sync way, take a look at [`Recoil`](https://github.com/recoilphp/recoil).)

# Conclusion

None of the clients is done yet, the [`Travis` client](https://github.com/php-api-clients/travis) is pretty close though. But the others aren't.
There is a lot of work to be done, and I'll go over the clients and how it has influenced the development of the packages january 2017. 
Times are going to be excited and a lot of cool stuff is coming our way pretty soon.
