---
author: WyriHaximus
comments: true
date: 2011-07-01 13:37
layout: post
slug: building-an-endless-imagephotoscreenshot-stream
title: Building an endless image/photo/screenshot stream
wordpress_id: 654
categories:
- JavaScript
- jQuery
- Snippets
- WoW-Screenshots
tags:
- AJAX
- Cakephp
- Endless
- Javascript
- jquery
- JSON
- Stream
- World of Warcraft
- wow-screenshots.net
---

For <a title="World of Warcraft: Screenshots" href="http://wow-screenshots.net/">WoW-Screenshots.net</a> I was looking for a sweet Endless Stream script but I only stumbled into some weird scripts that did more then they should or nothing at all. Finally I ran into a simple script giving some good hints.

For this script jQuery is required and the <a href="http://phpjs.org/functions/str_replace:527">str_replace port from phpjs.org</a>.

The basics of the script is are simple: on the window scroll event check if the user scrolled nearly or to the bottom of the page if so fetch information from the server and add them to the page.
<!-- More -->
First off we start with the class constructor

~~~javascript
function endlessEntityStream(conf) {
    var self = this;
}
~~~

We add a few configuration options and match them against the conf object:
~~~javascript
self.conf = {};
self.conf.loading = false;
self.conf.identifier = conf.identifier || 'EES_%id%';
self.conf.url = conf.url;
self.conf.count = conf.count;
self.conf.prevId = conf.initalId;
self.conf.template = conf.template;
~~~

We load the first batch upon constructing the class. Since the backend provides us with information whether or not we should continue checking for more:
~~~javascript
self.load(conf.startCount);
~~~

We hook into the window scroll event. This and the previous 2 blocks are code are all in the constructor:
~~~javascript
$(window).scroll(function(){
    self.check();
});
~~~

Now we need 2 settings and 2 getters to keep the code a bit cleaner 
~~~javascript
endlessEntityStream.prototype.setLoading = function(bool) {
    var self = this;
    self.conf.loading = bool ? true : false;
};

endlessEntityStream.prototype.getLoading = function() {
    var self = this;
    return self.conf.loading;
};

endlessEntityStream.prototype.setPrevId = function(prevId) {
    var self = this;
    self.conf.prevId = prevId;
};

endlessEntityStream.prototype.getPrevId = function() {
    var self = this;
    return self.conf.prevId;
};
~~~

The following functions are the most interesting. First the check function that checks the scroll status. Seccond the load function that does most of the heavy lifting.

The function works very simple. It check if you either scrolled to the end of the page or within the 500 pixels above the end of the page. Then it checks if a load is already in progress and load if not. Note the 500 in the function, change that to your needs if the default isn't working properly.
~~~javascript
endlessEntityStream.prototype.check = function() {
    var self = this;
    if($(window).scrollTop() == $(document).height() - $(window).height() || ($(window).scrollTop() + 500) >= $(document).height() - $(window).height()) {
        if(!self.getLoading()) {
            self.load(self.count);
        }
    }
};
~~~

We start the load function by preventing another load can start. Another imported part of this method is the replacing of 3 keywords with the corresponding information.

- %id% - the id of the last added item, the backend uses this the determine where to start reading
- %count% - the amount of items the backend should return
- %mathrnd% - a random number, it can be used to force updates



~~~javascript
endlessEntityStream.prototype.load = function(count) {
    var self = this;
    self.setLoading(true);
    url = self.conf.url;
    url = url.replace('%id%',self.conf.prevId);
    url = url.replace('%count%',self.conf.count);
    url = url.replace('%mathrnd%',Math.random().toString().replace('0.',''));
};
~~~

Now we know where we should fetch the information from we can send the request and parse the returned data:
~~~javascript
$.get(url,
    function(data){
        if (data != "") {
            var entities = $.parseJSON(data);
        }
    }
);
~~~

After the data has been parsed we'll walk through the data and add the item at the end of the stream. This happens in several steps. First off an identifier is generated for the current item and the identifier (based on the previous id) from the previous item is generated. Second the entity properties are matched against the template. And finally the item is added to the end of the stream and the current id is set as previous id.
~~~javascript
for(var entity in entities.shots) {
    var identifier = self.conf.identifier.replace('%id%', entities.shots[entity].id);
    var previousIdentifier = self.conf.identifier.replace('%id%', self.getPrevId());
    var html = self.conf.template;
    $.each(entities.shots[entity], function(index,value) {
        html = str_replace('%' + index + '%', value , html);
    });
    html = html.replace('%identifier%', identifier);
    $('#' + previousIdentifier).after(html);
    self.setPrevId(entities.shots[entity].id);
}
~~~

Once everything has been loaded we'll check the data if this is the last block or not. If it's the last block it keeps the loading process locked. If it isn't the last block it unlocks the loading process and invokes the check method again. This makes sure a user keeps buffered at all times until there is nothing more to fetch.
~~~javascript
if(entities.lastShot) {
    self.setLoading(true);
} else {
    self.setLoading(false);
    self.check();
}
~~~

We now have all the class code ready to use we need to tell it where to get it's data from and how to append it where. The following configuration options are needed to make it all work:

url - Url 
~~~javascript
http://domain.tld/path/to/stream/%id%/%count%/
~~~

target - The stream container
~~~javascript
ESSContainer
~~~

initalId - The id of the last item in the preloaded stream.
~~~javascript
123
~~~

count - The number of items to be returned by the server. %count% in the url parameter is replaced by this number.
~~~javascript
25
~~~

template - Template for the item placed at the end of the stream.
~~~javascript
<a href="%href%" id="%identifier%" title="%title%"><img src="%src%" alt="%title%" /></a>
~~~

debug - The debug option is optional but can be useful to debug issues with this script.
~~~javascript
true
~~~

Combined that gives you this:
~~~javascript
ees = new endlessEntityStream({
    url: 'http://domain.tld/path/to/stream/%id%/%count%/',    
    target: 'ESSContainer',
    initalId: 123,
    count: 5,
    template: '<a href="%href%" id="%identifier%" title="%title%"><img src="%src%" alt="%title%" /></a>'
});
~~~

~~~html
<div id="ESSContainer">
    <a id="EES_121" href="/model/view/121.html" title=""><img src="/img/121.jpg" alt="" /></a>
    <a id="EES_122" href="/model/view/121.html" title=""><img src="/img/122.jpg" alt="" /></a>
    <a id="EES_123" href="/model/view/121.html" title=""><img src="/img/123.jpg" alt="" /></a>
</div>
~~~

The script expects a JSON object in the following format:
~~~javascript
{
    "lastShot":false,
    "count":5,
    "shots":
    [
        {"id":"124","href":"\/model\/view\/124.html","src":"\/img\/124.jpg","title":""},
        {"id":"125","href":"\/model\/view\/125.html","src":"\/img\/125.jpg","title":""},
        {"id":"126","href":"\/model\/view\/126.html","src":"\/img\/126.jpg","title":""},
        {"id":"127","href":"\/model\/view\/127.html","src":"\/img\/127.jpg","title":""},
        {"id":"128","href":"\/model\/view\/128.html","src":"\/img\/128.jpg","title":""}
    ]
}
~~~

As you can see the object holds 2 configuration settings and 1 array with all the items. (Heck while writing this I realize that shots as name for the array might not but the appropriate name for a more general class.) The count property optional. lastShot tells the script if the shots array contains the last item and should stop polling after this.

<a href="https://github.com/WyriHaximus/endlessentitystream">This code is available on github.</a> As for the future of this project it will evolve for the upcoming time to become an even more powerful script. (Might turn it into a jQuery plugin.) For a live demo see <a title="World of Warcraft: Screenshots" href="http://wow-screenshots.net/">WoW-Screenshots.net</a>.