---
layout: post
title: "Piwik for Octopress"
date: 2013-05-11 19:56
comments: true
categories:
- Octopress
- Piwik
tags:
- Octopress
- Piwik
- Analytics
- Statistics
- Tracking
---

While going over the [Octopress Plugin list](https://github.com/imathis/octopress/wiki/3rd-party-plugins) I noticed the missing Piwik plugin. After digging around a bit I didn't find anything to my pleasing. So I've decided to create a configurable plugin using the new [async code](http://piwik.org/docs/javascript-tracking/#toc-where-can-i-find-the-piwik-tracking-code).
<!-- More -->
After wrapping the code in a template, the plugin only required 2 entries in `_config.yml`. The first for the host running piwik and 1 for your blogs side id.

~~~yaml
# Piwik
piwik_host_name: piwik.example.com
piwik_site_id: 1
~~~

The result can be found on [github](https://github.com/WyriHaximus/OctopressPiwik).