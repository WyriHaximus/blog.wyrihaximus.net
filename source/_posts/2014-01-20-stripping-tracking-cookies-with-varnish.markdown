---
layout: post
title: "Stripping tracking cookies with Varnish"
date: 2014-01-20 10:00
comments: true
categories:
- Google Analytics
- Piwik
- Cookies
- Varnish
---

The otherday I was messing with [Varnish](https://www.varnish-cache.org/ "Varnish cache community") to get caching up and running correctly. One [simple tool](http://www.isvarnishworking.com/ "Is Varnish working") helped with that, pointing out something this Varnish noob has missed out. The age for everything was `0`. Tracking cookies where the cause of that.

![varnish vcl file](/images/posts/fkpWVDd.jpg)

<!-- More -->

### Cookies ###

On my sites I use Google Analytics together with [Piwik](http://piwik.org/ "Piwik Analytics") for visitor tracking. They set a few cookies:

Google Analytics:

- __utma
- __utmb
- __utmc
- __utmz

Piwik:

- _pk_id
- _pk_ses

Where it's not a whole lot, they trick Varnish into thinking they are relevant to the application and there for have to be removed.

### Finding the right cookies ###

Finding the right cookies to block is easy but don't ignore what domain they are set on. Initially I included `disqus_unique` but quickly realized there was no need to as it's set on `.disqus.com`. Use your local [webinspector](https://developers.google.com/chrome-developer-tools/ "Chrome DevTools") that comes with your browser to figure out which to filter.

### default.vcl ###

To strip the cookies from the request I used Lee's code (see references at the bottom of this post). This bit must be placed in `vcl_recv` to work correctly.

~~~
  # Remove Google Analytics and Piwik cookies everywhere
  if (req.http.Cookie) {
      set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(__[a-z]+|has_js)=[^;]*", "");
      set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(_pk_(ses|id)[\.a-z0-9]*)=[^;]*", "");
  }
  # Remove the cookie when it's empty
  if (req.http.Cookie == "") {
      remove req.http.Cookie;
  }

~~~

You can strip fully named cookies from the request, for example `disqus_unique`, with this:

~~~
set req.http.Cookie = regsuball(req.http.Cookie, "(^|;\s*)(disqus_unique)=[^;]*", "");
~~~

### Conclusion ###

Remove tracking and other uninteresting cookies for your application is easy. But it might take a moment to figure out what exactly has to be filtered. You don't want to remove your session cookie.

### References ###

Give credit where credit is due:

- Lee's [Adventures in Varnish](http://blog.bigdinosaur.org/adventures-in-varnish/ "Adventures in Varnish") post yielded the cookie removal code as used above. It's an amazing post covering a lot more then just cookies, definitely worth to check out.
- Another good piece of documentation on cookies is the [Varnish wiki](https://www.varnish-cache.org/trac/wiki/VCLExampleRemovingSomeCookies "VCL Example Removing Some Cookies") it self.


