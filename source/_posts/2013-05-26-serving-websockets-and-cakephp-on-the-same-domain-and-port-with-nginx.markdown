---
layout: post
title: "Serving websockets and CakePHP on the same domain and port with nginx"
date: 2013-05-26 21:09
comments: true
categories: 
- Nginx
- CakePHP
- Websockets
tags:
- Nginx
- CakePHP
- Websockets
---

While working on my <a href="https://wyrihaximus.net/projects/cakephp/ratchet.html" title="Ratchet for CakePHP" target="_blank">CakePHP Ratchet plugin</a> I got to the point where my server had to be prepared for the new way of communication. Lukely nginx released 1.3.13 with websocket support recently. Thus allowing to serve both the website and websockets over the same port and hostname. (Key if you intend to use cookies.)
<!-- More -->
To acomplish this we define 2 location blocks. 

First the websocket block. Key in this block are the `Upgrade` and `Connection` headers coming with `HTTP 1.1`.

~~~nginx
location = /websocket {
    proxy_pass http://websocketdomain;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_redirect off;
}
~~~

This refers to the following upstream block linking nginx to our websocket server.

~~~nginx
upstream websocketdomain{
    server 127.0.0.1:54321;
}
~~~

The second location block we need is for our PHP handling. It simply sends all .php files to `php-fpm` running at `127.0.0.1:9001`.

~~~nginx
location ~ .*\.php$ {
    include /etc/nginx/fastcgi_params;
    fastcgi_pass 127.0.0.1:9001;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME /path/to/domain$fastcgi_script_name;
}
~~~

Those 2 blocks together aren't a problem. The issues begin when a rewrite is added that internally rewrites the request to `index.php` if the request URI isn't found. This rewrite is needed for CakePHP's pretty URL's. To counter that issue I'm using an idea by <a href="http://rosslawley.co.uk/2010/01/nginx-how-to-multiple-if-statements/" target="_blank">Ross Lawley</a>. It's based on the set and if directives. We'll start with the detection if we are using websockets or not based on the websocket path. If we match the request path to the one websockets are mapped on we set `$test` to `W`.

~~~nginx
if ($request_uri = '/websocket') {
    set $test W;
}
~~~

Next is a test if the requested file doesn't exists. When it doesn't `P` is appended to `$test`.

~~~nginx
if (!-e $request_filename) {
    set $test "${test}P";
}
~~~

This sets the stage for a final check.

~~~nginx
if ($test = P) {
    rewrite ^/(.+)$ /index.php?url=$1 last;
    break;
}
~~~

Combining all of this results in the following gist and causes all websocket connections made to `ws://websocketdomain/websocket` forwarded to `127.0.0.1:54321`:
{#{{ gist(5238720) }}#}