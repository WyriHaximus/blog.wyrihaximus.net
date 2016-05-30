---
author: WyriHaximus
comments: true
date: 2010-10-31 21:20
layout: post
slug: a-styling-guide-for-predominant-cakephp-tags-plugin-article
title: A styling guide for @predominant cakephp tags plugin article
wordpress_id: 679
categories:
- CakePHP
- Snippets
tags:
- Cakephp
- CSS
- php
- predominant
- Tag Cloud
- Tags
---

This post assumes you've completed reading Graham Weldon (<a href="https://twitter.com/predominant">@predominant</a>) <a href="http://www.cakedc.com/graham_weldon/2010/10/29/using-the-cakedc-tags-plugin-for-cakephp">article</a> on using the plugin, the <a href="http://cakedc.com/downloads#tags">plugin pages</a> them self and in specific the the <a href="https://github.com/CakeDC/tags/wiki/Display-a-Tag-cloud-with-the-TagCloud-helper">tag cloud helper page</a>. The helper example sets a size attribute  on the li tag. A way to utilize this would be writing a piece of jQuery (or javascript in general) that would take it and apply some styling to it. This would mean a lot more resource usage compared to pure CSS.

<!-- More -->

## The PHP ##

At the PHP side we need to change a few things currently this is the code:

~~~php
echo $this->TagCloud->display($tags, array(
	'before' => '<li size="%size%" class="tag">',
	'after' => '</li>'));
~~~

We'll be change that into this:

~~~php
echo $this->TagCloud->display($tags, array(
	'before' => '<li class="fs%size% tag">',
	'after' => '</li>',
	'maxSize' => 50,
	'minSize' => 1));
~~~

As you can see a few things change. First off we also supply the min and maxSize options. The helper uses these and calculates a number in between those values, we'll use those numbers for the CSS classes later on. A option that change is before as you can see %size% is now used for a class, this class will contain it's font-size and any options you might want to add yourself.

## Generating the CSS ##

If your lazy and just want a working example you can skip this bit and skip to `The CSS`. Since the example requires 50 css class and it takes alot of time to calculate the required values by hand I've a little script to do it for me/us.

~~~php
<?php
$css = '';
$class = 'fs';
$start_size = 0.75;
$stop_size = 2.5;
$count = 50;
$precision = 4;
for($i=1;$i<=$count;$i++) {
        $css .= '.' . $class . $i . '{font-size:' . round((((($stop_size - $start_size) / ($count - 1)) * ($i - 1)) + $start_size),$precision) . "em;}\r\n";
}
echo $css;
~~~

The script has a few configuration values.
<ul>
	<li>class - the prefix to the %size% value</li>
	<li>start_size - the smallest possible tag size in em</li>
	<li>stop_size - the biggest possible tag size in em</li>
	<li>count - The number of classes and for now 50 :)</li>
	<li>precision - the maximum of digest behind the dot</li>
</ul>
<strong>The CSS</strong>

~~~css
.fs1{font-size:0.75em;}
...
.fs50{font-size:2.5em;}
~~~

(<a href="http://static.wyrihaximus.net/blog/cakephp_tag_cloud.css">Click here for the complete list.</a>)

## The Result ##
<a href="https://blog.wyrihaximus.net/wp-content/uploads/2010/10/cakephp_tagcloud_styled_example.jpg"><img class="aligncenter size-full wp-image-688" title="cakephp_tagcloud_styled_example" src="https://blog.wyrihaximus.net/wp-content/uploads/2010/10/cakephp_tagcloud_styled_example.jpg" alt="" width="400" height="104" /></a>