---
layout: post
title: "Github tips"
date: 2016-08-19 09:12dw
comments: true
categories:
- PHP
- Github
tags:
- PHP
- Github
- Chrome
- Firefox
- Opera
- Safari
social:
  image_relative: /images/posts/daftpunktocat-cat.gif
---

[`Github`](https://github.com/) has fundamentally changed the opensource landscape, especially for those among us remembering the sourceforge days. While Github is powerful out of the box there are some tips, tricks, and browser addons that can be used to improve the experience. 

![Deployment](/images/posts/daftpunktocat-cat.gif)

<!-- More -->

# Tips

* Following interesting developers like [`Jakub Kulhan`](https://github.com/jakubkulhan), [`David Dan`](https://github.com/davidwdan), and in case you're interested [here is my account](https://github.com/wyrihaximus/).
* Star all the repositories that are interesting or might be handy in the future (I'm currently at [1.4K](https://github.com/stars/wyrihaximus/) starred repositories). You can always search through your starred repositories to find what you've starred ages ago at [github.com/stars](https://github.com/stars). (PSA: This information is public and can be viewed by everyone, also users not signed in. If you hasitate starring a repository you find interesting for what ever reason, keep a list on [Google Keep](https://keep.google.com/), [Evernote](https://evernote.com/), [Dropbox](https://www.dropbox.com/) etc etc.)
* Subscribe to the [Github Explore](https://github.com/explore) newsletter at the bottom of the explore page, or by going [here](https://github.com/explore/subscribe). Mine is set to daily. It sends you a short list of the trending repositories for today, but also what the developers you follow starred the past 24 hours.

![Github Explode Subscribe](/images/posts/rEq3ivg.png)

# Tricks

* Sign your tags, with `git tag -s -m "" 1.2.3`, using a GPG key, for example from [keybase.io](https://keybase.io/). The great advantage from this is that your users can verify their downloads against attacks. For more information on how to set that up check [this repository](https://github.com/pstadler/keybase-gpg-github).
* Make pull requests for everything, and I mean everything. If you're not doing this it might sound like a lot of extra work, and it in a way it is, but it allows you to keep track of different features and you can work on two features at the same time without them interfering within master. For example you can pause the work on a feature for a while without blocking the work on others. Add [`Travis CI`](https://travis-ci.org/), [`CircleCI`](https://circleci.com/), and/or [`AppVeyor`](https://ci.appveyor.com/) to the mix for quality control and always know what the status of your code/project is.
* Don't build monolithic repositories, build small specificly purposed repositories instead, and when a project grows to big for your own namespace, put it onder an orginization. The past few weeks I've been working on a async-first [`Travis CI client`](https://github.com/wyrihaximus/php-travis-client) (and a async-first [`Pusher client`](https://github.com/php-api-clients/pusher), and [`AppVeyor client`](https://github.com/php-api-clients/appveyor) for that matter). It occured to me that all the stuff I was building there could be useful to others but the repository count was constantly growing. Decided to put it onder the [`php-api-clients`](https://github.com/php-api-clients) for a couple of reasons. A) to keep my own namespace clean. B) To group related packages together into a org scoped for them. C) Easy repository permission management for when others get onboard granting them permissions to the repositories they want to work on. Or even create new repositories for projects they want to build that fall under the scope of the org. 

# Browser addons

The default experience on [github.com](https://github.com/) is powerful by default but these addons amp it up a notch.

## OctoLinker (![Chrome](/images/browsers/chrome_24x24.png)/![Firefox](/images/browsers/firefox_24x24.png)/![Opera](/images/browsers/opera_24x24.png))

[`OctoLinker`](https://github.com/OctoLinker/browser-extension/) is a great time server, when in a `composer.json` it lets you click a dependency taking you to that dependency's repository. No need to look it up on [`packagist`](https://packagist.org/) anymore, the addon does that for you.
  
<iframe width="960" height="720" src="https://www.youtube-nocookie.com/embed/OXCwVxHWSBs?rel=0" frameborder="0" allowfullscreen></iframe>

## Octotree (![Chrome](/images/browsers/chrome_24x24.png)/![Firefox](/images/browsers/firefox_24x24.png)/![Opera](/images/browsers/opera_24x24.png)/![Safari](/images/browsers/safari_24x24.png))

[`Octotree`](https://github.com/buunguyen/octotree/) Makes your whole repository directory structure available as a tree for quick and easy browsing.
 
![Octotree](/images/posts/octotree.png)

## Isometric Contributions (![Chrome](/images/browsers/chrome_24x24.png)/![Firefox](/images/browsers/firefox_24x24.png)/![Safari](/images/browsers/safari_24x24.png))

[`Isometric Contributions`](https://github.com/jasonlong/isometric-contributions) is mainly just a fancy, and have to admint very cool, way of displaying your contribution graph.

![Isometric Contributions](/images/posts/35NxTej.png)

## PixelBlock (![Chrome](/images/browsers/chrome_24x24.png))

While [`PixelBlock`](https://chrome.google.com/webstore/detail/pixelblock/jmpmfcjnflbcoidlgapblgpgbilinlem?utm_source=chrome-app-launcher-info-dialog) isn't technically a Github browser addon, it is a Gmail browser addon. It blocks tracking pixels in emails, Github's tracking pixels included. As mentioned before I watch all projects and repositories I'm involved with and that can lead to a lot of email at times. The issues with Github's tracking pixel is that when you read the mail it will also mark those comments tracked on github.com. That is fine but it if you also use [github.com's unread notifications](https://github.com/notifications) you lost track of those on the website. As a bonus it also blocks a lot of other tracking pixels.

![PixelBlock](/images/posts/YmKYONg.png)
