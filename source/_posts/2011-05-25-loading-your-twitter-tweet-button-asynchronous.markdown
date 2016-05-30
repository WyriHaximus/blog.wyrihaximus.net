---
author: WyriHaximus
comments: true
date: 2011-05-25 16:50
layout: post
slug: loading-your-twitter-tweet-button-asynchronous
title: Loading your Twitter Tweet Button asynchronous
wordpress_id: 747
categories:
- JavaScript
- Snippets
tags:
- facebook
- Flattr
- Javascript
- twitter
---

## Twitter has updated their buttons to be asynchronousby default! ##

Check out [twitter.com/buttons](https://twitter.com/buttons)

### Original post ###

For [wow-screenshots.net](http://wow-screenshots.net/) I was looking to boost the loading speed of the site. By spending as little time as possible waiting on additional resources. The [Tweet Button](https://twitter.com/about/resources/tweetbutton) by Twitter is loading in a blocking way so it is slowing down the page. It uses basic HTML elements and transforms them with a little bit of javascript. We can load the javascript in a non-blocking way to give the user a faster page loading experience. [Flattr](https://flattr.com/support/integrate/js) is showing how it's done by loading the script in a asynchronous way and and transform basic HTML elements into widgets:
<!-- More -->

~~~html
<script type="text/javascript">// <![CDATA[
/* <![CDATA[ */
    (function() {
    	var s = document.createElement('script'), t = document.getElementsByTagName('script')[0];
    	s.type = 'text/javascript';
    	s.async = true;
    	s.src = 'http://api.flattr.com/js/0.6/load.js?mode=auto';
    	t.parentNode.insertBefore(s, t);
	})();
/* ]]> */
// ]]></script>
~~~

The same can be done with Twitter by replacing the standard &lt;script&gt; tag:

~~~html
<script type="text/javascript" src="http://platform.twitter.com/widgets.js"></script>
~~~

With this:

~~~html
<script type="text/javascript">// <![CDATA[
(function() {
        var twitterScriptTag = document.createElement('script');
        twitterScriptTag.type = 'text/javascript';
        twitterScriptTag.async = true;
        twitterScriptTag.src = 'http://platform.twitter.com/widgets.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(twitterScriptTag, s);
})();
// ]]></script>
~~~

Though the real loading might be longer, the users perceives the page as loading fast.

P.S. For this post I was going to include Facebook, but while going over their API docs they added asynchronous support since the last time I checked. As for the reddit button, that took a bit more work more about that another time.