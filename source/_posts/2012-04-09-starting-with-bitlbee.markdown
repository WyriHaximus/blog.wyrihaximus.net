---
author: WyriHaximus
comments: true
date: 2012-04-09 19:58
layout: post
slug: starting-with-bitlbee
title: Starting with BitlBee
wordpress_id: 814
categories:
- Bitlbee
- IRC
- Snippets
tags:
- Bitlbee
- facebook
- google talk
- jabber
- xmpp
---

A while ago I was somehow introduced to [bitlbee](http://www.bitlbee.org/) and I loved the concept. Not only for the possibilitie to have IRC, FB, MSN and Google Talk in the same application/window. But also cause it can be extended to be used as a real-time log viewer for your CI Server and website. This is a first of 3 blog posts on the subject with some extra tips & tricks on the side.
<!-- More -->
**Setting it all up**

It's just a simple aptitude command to install and start it, after it's installed you connect to it with your favorite IRC client. Once you're connected make sure you register with the server and follow the quickstart intro.


~~~bash
sudo aptitude install bitlbee
~~~


**Configure**** Facebook**

Setting up facebook is simple but you need to keep a few things in mind. First off you need a [Facebook username](http://www.facebook.com/help/usernames/general). Next run this command and make sure you type your username all lowercase cause it will fail if you don't. (Note that you can use _acc_ instead of _account_ if you don't like typing it over and over again.)

~~~irc
account add jabber USERNAME@chat.facebook.com PASSWORD
~~~


Since by default userId's will be shown instead of full names we use the following 2 commands to use the full name and add a [fb] prefix to each facebook user.

~~~irc
account facebook set nick_source full_name
account fb set nick_format [fb]%-@full_name
~~~


**Configure Google Talk (Jabber/XMPP)**

Adding your Google Talk account is as simple as adding a facebook account. Just replace USERNAME with the Google account email address.

~~~irc
account add jabber USERNAME PASSWORD talk.google.com:5223:ssl
~~~


Just like the facebook account we also set a prefix here.

~~~irc
account gtalk set nick_format [gtalk]%-@handle
~~~


**Giving each account it's own channel**

The following commands create channels for Facebook and Google Talk and set them to only show Facebook users in the facebook channel and Google Talk users in the gtalk channel.

~~~irc
/join &facebook
channel facebook set fill_by account
channel facebook set account fb
/join &gtalk
channel gtalk set fill_by account
channel gtalk set account 0
~~~

**Finishing up**

Now that we set everything up we want to connect our accounts simply run the following command and it will connect to the remote servers.


~~~irc
account on
~~~

Just hit the save command to save your configuration to disk.

~~~irc
save
~~~

**Interesting reads/links**



	
  * [My perfect Irssi setup](http://www.kungfoocode.org/how-to/my-perfect-irssi-setup/)

	
  * [BitlBee](http://www.bitlbee.org/)

	
  * [Identi.ca, Twitter and Jabber with BitlBee via Irssi](http://body0r.wordpress.com/2010/10/14/identi-ca-twitter-and-jabber-with-bitlbee-via-irssi/)


