---
author: WyriHaximus
comments: true
date: 2011-09-08 20:11
layout: post
slug: shortcode-in-feedburner-email-widget-1-1-3-for-wordpress
title: Shortcode in Feedburner Email Widget 1.1.3 for wordpress
wordpress_id: 798
categories:
- Feedburner Email Widget
- JavaScript
- Releases
- Wordpress
tags:
- Feedburner email widget
- php
- shortcode
- Wordpress
---

In the just released Feedburner Email Widget 1.1.3 a shortcode has been added by request. The shortcode can be used in 2 different ways in posts you use 

~~~text
[feedburner_email_widget uri="http://feedburner.url.here"]
~~~

and in php you use 

~~~php
<?php echo feedburner_email_widget_shortcode_func(array('uri'=>"http://feedburner.url.here")); ?>
~~~

Both methods make a call to the same function and the arguments reflect the available settings for the widget through the wp-admin.


- Title -> title
- Feedburner feed URL -> uri
- Above input text -> above_email
- Below input text -> below_email
- Input placeholder text -> email_text_input
- Submit button caption -> subscribe_btn
- Show feedburner link -> show_link
- Form CSS ID -> form_id
- CSS Styling -> css_style_code
- Analytics Category -> analytics_cat
- Analytics Action -> analytics_act
- Analytics Label -> analytics_lab
- Analytics Value -> analytics_val