---
layout: post
title: "Keeping your Disqus comments migrating from WordPress to Octopress"
date: 2013-05-21 19:25
comments: true
categories: 
- Disqus
- WordPress
- Octopress
---

When migrating to Octopress I wanted to make sure the comments would follow me from WordPress. Since Disqus is build into Octopress it requires near-zero setup time, but when taking your precious comments with you it gets slightly harder, just a bit. To export my post from WordPress I've used [exitwp](https://github.com/thomasf/exitwp) by [Thomas Frössman](https://github.com/thomasf). It does a brilliant job exporting the posts (though I had some issues with custom markup code) and metadata. Most importantly the `wordpress_id` field, we'll be needing that.
<!-- More -->
## disqus.html ##

Open `source/_includes/disqus.html` and find:

{#{% include_code 2013-05-21-keeping-your-disqus-comments-migrating-from-wordpress-to-octopress/disqus_html_before.html lang:javascript %}#}

And replace that with:

{#{% include_code 2013-05-21-keeping-your-disqus-comments-migrating-from-wordpress-to-octopress/disqus_html_after.html lang:javascript %}

This sets the `disqus_identifier` to the format the Disqus WordPress plugin uses to identify posts. Since Octopress uses the post URL as `disqus_identifier` we're making sure only old WordPress posts use the old format.

## article.html ##

While the previous section does the trick for the actual Disqus thread the link to the thread still requires some work. It uses the same `disqus_identifier` var but in html attribute form `data-disqus-identifier`. (As documented [here](http://help.disqus.com/customer/portal/articles/565624).)

Open `source/_includes/article.html` and find:

{#{% include_code 2013-05-21-keeping-your-disqus-comments-migrating-from-wordpress-to-octopress/article_html_before.html lang:html %}#}

And replace with:

{#{% include_code 2013-05-21-keeping-your-disqus-comments-migrating-from-wordpress-to-octopress/article_html_after.html lang:html %}#}

## Conclusion ##

In my experience the `disqus.html` changes are instant while the `article.html` changes take some time to work their way through the system. Not sure why to be honest. How ever after that time everything migrated with you and your readers can be happy their comments didn't go to waste.