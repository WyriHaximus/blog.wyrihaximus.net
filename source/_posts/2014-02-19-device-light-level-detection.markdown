---
layout: post
title: "Device light level detection"
date: 2014-02-19 21:20
comments: true
categories:
- Device ambient light
- Front-End
- CSS3
- HTML5
- Mobile
---

A few days ago I ran into [this article](http://girliemac.com/blog/2014/01/12/luminosity/) by [Tomomi Imura](https://twitter.com/girlie_mac) about ambient light level detection and use by the websites. Immediately intrigued by the possibilities this opens up I started digging a bit further and think of how I could use it in my upcoming redesign. (Looking something up in the middle of the night half a sleep, on a site with a full white background is a near instant headache for example.) There was one thing missing, correct me if I'm wrong, a simple way to test it on your device (if supported). Hence this post.

![Maglite aimed at Nexus 5](/images/posts/maglite-aimed-at-nexus-5.jpg)

<!-- More -->

Don't get me wrong Tomomi did a great job making the [video](http://vimeo.com/79466285) and putting the code up on [codepen.io](http://codepen.io/girliemac/pen/pvmBs). But what I was really looking for was this a simple page to browse to. And the codepen page is fine on desktop but a PITA on a smartphone.

The 2 labels below show the results from the `devicelight` and `lightlevel` events of your device, sidenote nothing happens until the value changes:

<strong>devicelight:</strong>&nbsp;<span id="devicelight_value"><font style="color: red;">Not supported on your device</font></span><br />
<strong>lightlevel:</strong>&nbsp;<span id="devicelightlevel_value"><font style="color: red;">Not supported on your device</font></span>
<script>
    window.addEventListener('devicelight', function(event) {
        document.querySelector('#devicelight_value').textContent = event.value + ' lux';
        document.querySelector('#devicelight_value').style.color = 'green';
    });

    window.addEventListener('lightlevel', function(event) {
        document.querySelector('#devicelightlevel_value').textContent = event.value;
        document.querySelector('#devicelightlevel_value').style.color = 'green';
    });
</script>

Only was able to get results using [Firefox](https://play.google.com/store/apps/details?id=org.mozilla.firefox). Detected with the following code:
~~~js
    window.addEventListener('devicelight', function(event) {
        document.querySelector('#devicelight_value').textContent = event.value + ' lux';
        document.querySelector('#devicelight_value').style.color = 'green';
    });

    window.addEventListener('lightlevel', function(event) {
        document.querySelector('#devicelightlevel_value').textContent = event.value;
        document.querySelector('#devicelightlevel_value').style.color = 'green';
    });
~~~

For a more detailed post on the subject check Tomomi's post: [Responsive UI with Luminosity Level](http://girliemac.com/blog/2014/01/12/luminosity/)!