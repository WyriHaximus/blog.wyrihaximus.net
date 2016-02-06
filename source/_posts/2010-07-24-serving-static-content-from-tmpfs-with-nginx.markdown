---
author: WyriHaximus
comments: true
date: 2010-07-24 21:20
layout: post
slug: serving-static-content-from-tmpfs-with-nginx
title: Serving Static Content from tmpfs with Nginx
wordpress_id: 630
categories:
- Nginx
- Snippets
- WyriMaps
tags:
- memcached
- Nginx
- RAM
- tmpfs
- WyriMaps
---

One way to speed up <a title="WyriMaps.net World of Warcraft Map" href="http://wyrimaps.net/wow">WyriMaps.net</a> is to preload popular tiles and nodes to avoid the disk IO build up with a lot of visitors on the map moving around, zooming in and out and adding/removing node sets to the map. Using tmpfs is a simple way to use the RAM as extra cache to speed up your webpages. Tho <a href="http://bretthoerner.com/blog/2008/oct/27/using-nginx-memcached-module-django/">another way</a> to do that is using <a title="Nginx Memcached Module" href="http://wiki.nginx.org/NginxHttpMemcachedModule">memcached</a> wich is more interesting if you have <a href="http://www.igvita.com/2008/02/11/nginx-and-memcached-a-400-boost/">several servers</a> instead of one.

<!-- More -->

## Preparation ##

First off make sure you have <a href="http://wiki.nginx.org/Main">Nginx</a> and tmpfs installed and the following diretories created:

~~~nginx
/var/www/static.website.tld/
/mnt/tmpfs/nginx/static.website.tld/
~~~

The first contains the files to serve on disk we need them in case we can't find anything n the memory. The seccond is the RAMDisk using tmpfs you mount using the following line in /etc/fstab:

~~~bash
tmpfs                   /mnt/tmpfs/nginx        tmpfs   rw                              0 0
~~~

The last thing to prepare is a script that automaticly sets up the directories within the /mnt/tmpfs/nginx mount point. Since everything happens within the RAM of the server it's all lost after a crash/shutdown/reboot.

## Configuration The server ##

Next up is configuring nginx in/etc/nginx/nginx.conf (or somewhere else depending on your distro) to start with error handling every time nginx can't find a file on tmpfs it generates an error even if it finds it later on the disc.

~~~nginx
error_log /dev/null crit;
~~~

Seccondly within the `http { }` section we add to allow us to check the RAM first then the disc and then serve a 404 error page/image/something.

~~~nginx
recursive_error_pages on;
~~~

Aside from these settings it's wise to look into the <a href="http://wiki.nginx.org/NginxHttpGzipModule">Gzip</a> and <a href="http://wiki.nginx.org/NginxHttpCoreModule">core</a> modules for speeding up the transfer of data and buffering settings.

## Configuration The host ##

Now this is the fun part ;). To start we create the `server { }` section within the `http { }` section. We add the following basic settings to make sure it listens on port 80 to the correct host (static.website.tld) and set the expiration to max so we don't keep serving the files:

~~~nginx
listen          80;
server_name     static.website.tld;
expires max;
~~~

We tell the server to look in the tmpfs mount first and to check the disc after that:

~~~nginx
root /mnt/tmpfs/nginx/static.website.tld/;
error_page 404 = @static_website_tld_disc;
~~~

By telling nginx to check `@static_website_tld_disc` after it checked tmpfs and creating a location block we can add another 404 error_page (this is where the error_page nesting comes in we enabled earlier) to serve an error page:

~~~nginx
location @static_website_tld_disc {
	root /var/www/static.website.tld/;
	error_page 404 = /404.html;
}
~~~

Now nginx first checks the ram for files and after that the disc we have one final block to add so we also serve a neat <a href="http://www.smashingmagazine.com/2007/08/17/404-error-pages-reloaded/">4</a><a href="http://www.lightecho.net/404page/404_fame.html">0</a><a href="http://www.huffingtonpost.com/2010/02/11/best-404-error-pages-ever_n_456767.html">4</a> <a href="http://www.cyberdesignz.com/blog/website-design/20-best-404-error-page-design-examples-to-enhance-the-usability-of-your-site/">error</a> page. As final step with add a block that will tell nginx where to find 404.html (note that in the root in the block below there `has` to be a file named `404.html`).
~~~nginx
location = /404.html {
	root /mnt/tmpfs/nginx/static.website.tld;
}
~~~

As the block shows I'm serving it from RAM and everytime the machine boots a script puts the 404.html file on the tmpfs mount. This results in the following config and keeps <a href="http://wyrimaps.net/wow">WyriMaps.net/WoW</a> fast under high load.

~~~nginx
error_log /dev/null crit;
http {
	recursive_error_pages on;
	server {
		listen          80;
		server_name     static.website.tld;
		expires max;
		root /mnt/tmpfs/nginx/static.website.tld/;
		error_page 404 = @static_website_tld_disc;
		location @static_website_tld_disc {
			root /var/www/static.website.tld/;
			error_page 404 = /404.html;
		}
		location = /404.html {
			root /mnt/tmpfs/nginx/static.website.tld;
		}
	}
}
~~~

Enjoy :D!

Wyri