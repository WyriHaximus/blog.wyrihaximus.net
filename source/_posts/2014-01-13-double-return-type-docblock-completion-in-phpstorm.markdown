---
layout: post
title: "Double return type docblock completion in PHPStorm"
date: 2014-01-13 19:56
comments: true
categories:
- PHPStorm
- Docblock
- Documentation
- PHP
---

After getting my hands on a [PHPStorm](http://www.jetbrains.com/phpstorm/ "PHPStorm from JetBrains") key at [PFCongres](http://www.pfcongres.com/ "PFCongress The Web Development Conference") last year I've been using it exclusively for all my PHP projects, ditching `Netbeans` in the process. Yesterday I tweeted about how smooth PHPStorm picks up mixed return times and autocompletes the docblocks for it. I've been asked to do a quick post on how to make it do that.

<blockquote class="twitter-tweet" lang="en"><p><a href="https://twitter.com/WyriHaximus">@WyriHaximus</a> any chance of you doing a small blog post on it to show how you did it? I had trouble the last time /cc: <a href="https://twitter.com/rdohms">@rdohms</a> <a href="https://twitter.com/phpstorm">@phpstorm</a> <a href="https://twitter.com/search?q=%23php&amp;src=hash">#php</a></p>&mdash; Khayrattee Wasseem (@7php) <a href="https://twitter.com/7php/statuses/422480077687762945">January 12, 2014</a></blockquote>

<!-- More -->

### PhuninNode ###

A while ago I've create a [munin-node](http://munin-monitoring.org/wiki/munin-node "munin-node") clone in PHP using [reactPHP](http://reactphp.org/ "reactPHP") as a learning project but also to monitor my modem for the then flaky cable connection. Which resulted in some really neat images:

![CISCO EPC3925 Upstream Power Level - by month](/images/posts/uAPKMrm.png)

### DocBlocks ###

The code was really hacky and was the idea where [PhuninNode](https://github.com/WyriHaximus/PhuninNode "munin-node in PHP") is based on. When starting on the project I did minimal testing and no docblocks at all. Rewrote all the test and added more a month or 2 ago. So I spend a part of my Sunday and the following Monday adding docblocks to the entire code. While doing that I noticed that PHPStorm in a particular case picked up with possible both return types near perfect.

### Setting the stage ###

At the time of the occurrence I was working in `\WyriHaximus\PhuninNode\Node` (you can check it out on [Github](https://github.com/WyriHaximus/PhuninNode/blob/master/src/WyriHaximus/PhuninNode/Node.php "\WyriHaximus\PhuninNode\Node") as the code examples are kept to a bare minimum). Which as a `__construct`, pay extra attention to line `8`:

~~~php
<?php

class Node
{
    private $plugins;
    public function __construct()
    {
        $this->plugins = new \SplObjectStorage;
    }
}
~~~

The class also has a method `getPlugin`. As you can see that method can return both an object or false when it can't find a plugin matching the `$slug`.

~~~php
<?php

class Node
{
	
    public function getPlugin($slug)
    {
        $this->plugins->rewind();
        while ($this->plugins->valid()) {
            if ($this->plugins->current()->getSlug() == $slug) {
                return $this->plugins->current();
            }
            $this->plugins->next();
        }

        return false;
    }
}
~~~

### Adding the DocBlock ###

To whitness this little piece of (black) magic put your cursor on line `5` type `/**`, then press return/enter.  (I assume most of you know but mentioned it for those that don't.) That will create the following docblock, correctly picking up both possible return types:

~~~php
<?php

class Node
{
    /**
     * @param $slug
     * @return bool|object
     */
    public function getPlugin($slug)
    {
	}
}
~~~

### Improving the already great ###

This is one of the little things that makes PHPStorm great! It could be even better, as I mentioned it's near perfect. And hey I'm not complaining I love PHPStorm! If it would have picked what the `addPlugin` method does with `$this->plugins`:

~~~php
<?php

class Node
{
    public function addPlugin(\WyriHaximus\PhuninNode\PluginInterface $plugin)
    {
        $this->plugins->attach($plugin);
    }
}
~~~

As that is the only method that alters the state of `$this->plugins` by pushing new `\WyriHaximus\PhuninNode\PluginInterface` implementing objects into it. The outcome of that could be this docblock:

~~~php
<?php

class Node
{
    /**
     * @param $slug
     * @return bool|PluginInterface
     */
    public function getPlugin($slug)
    {
    }
}
~~~

### Conclusion ###

These little things are making PHPStorm awesome and great to work with. When ever my license ends I'll be sure to get a new one one way or the other. The team at JetBrains does a great job on this project and it really shines with these kind of features.