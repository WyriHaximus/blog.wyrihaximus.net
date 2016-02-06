---
author: WyriHaximus
comments: true
date: 2010-05-17 13:04
layout: post
slug: flattr-cakephp-helper
title: Flattr Cakephp helper
wordpress_id: 572
categories:
- CakePHP
- Snippets
tags:
- CakePHP
- Flattr
- helper
---

EDIT: <a title="Flattr CakePHP 1.3 Helper" href="http://www.dereuromark.de/2010/12/20/flattr-cakephp-1-3-helper/" target="_blank">DerEuroMark wrote an excellent replacement for this helper</a>.

After the <a href="http://blog.wyrihaximus.net/2010/05/flattr-mod-for-phpbb3/">Flattr MOD for phpBB3</a> release 2 days ago I wrote this simple <a href="http://flattr.com/">flattr</a> <a href="http://book.cakephp.org/view/98/Helpers">cakephp helper</a> (basic cakephp helper knowledge is required) to aid cakephp developers integrate flattr quick and easy into their websites. The helper has only 1 function and is very simple in use.
<!-- More -->
## Basic usage ##

~~~php
echo $flattr->badge(array(
	'uid' => 4080,
	'tle' => 'test',
));
~~~

As you can see this is the bare minimum in options you need to use to get it to work.

- `uid` The Flattr User ID as found on the <a href="https://flattr.com/dashboard">Flattr dashboard</a> (in the example I used mine).
- `tle` The title for the link to be submitted.

Since the helper supports the full range of options below are the other options:

- `dsc` A description for the link.
- `cat` The category for the link. This can be any of the following: text, images, video, audio, software, rest. The default if this option isn't specified is text.
- `lng` The language of the link. Any of the languages on <a href="https://flattr.com/support/integrate/languages">this list</a> and defaults to en_GB.
- `tags` Any tags matching the link. This field <strong>must</strong> be an array!
- `url` The URL of the link.
- `btn` The badge to use. Currently the only option is compact but if not specified or set to something else it defaults to the standard larger badge

<a href="http://static.wyrihaximus.net/blog/flattr_cakephp_helper.txt">app/views/helpers/flattr.php</a>

~~~php
class FlattrHelper extends Helper {
	public $helpers = array('Javascript');
	function badge($options=array()) {
		App::import('Sanitize');
		$vars = '';
		$vars .= "var flattr_uid = '" . intval($options['uid']) . "';\r\n";
		$vars .= "var flattr_tle = '" . $options['tle'] . "';\r\n";
		if(!isset($options['dsc']))
		{
			$options['dsc'] = '';
		}
		$vars .= "var flattr_dsc = '" . $options['dsc'] . "';\r\n";
		if(!isset($options['cat']))
		{
			$options['cat'] = 'text';
		}
		$vars .= "var flattr_cat = '" . $options['cat'] . "';\r\n";
		if(!isset($options['lng']))
		{
			$options['lng'] = 'en_GB';
		}
		$vars .= "var flattr_lng = '" . $options['lng'] . "';\r\n";
		if(isset($options['tags']) && count($options['tags'])&gt;0)
		{
			array_walk($options['tags'],'Sanitize::paranoid');
			$vars .= "var flattr_tag = '" . implode(', ',$options['tags']) . "';\r\n";
		}
		if(isset($options['url']) &amp;&amp; ((version_compare(phpversion(), '5.2.0', '>=')  && function_exists('filter_var')) ? filter_var($options['url'], FILTER_VALIDATE_URL) : true))
		{
			$vars .= "var flattr_url = '" . $options['url'] . "';\r\n";
		}
		if(isset($options['btn']) &amp;&amp; $options['btn']=='compact')
		{
			$vars .= "var flattr_btn = 'compact';\r\n";
		}
		$code = $this->Javascript->codeBlock($vars, array('inline' => true));
		$code .= $this->Javascript->link('http://api.flattr.com/button/load.js', array('inline' => true));
		return $code;
	}
}
~~~
