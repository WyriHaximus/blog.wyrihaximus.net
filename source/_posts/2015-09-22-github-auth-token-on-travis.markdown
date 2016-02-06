---
layout: post
title: "Github auth token on TravisCI"
date: 2015-09-23 12:50dw
comments: true
categories:
- PHP
- Github
- Composer
- TravisCI
- TravisCI Series
tags:
- PHP
- Github
- Cache
- Composer
- TravisCI
social:
  image_relative: /images/posts/composer-github-auth-error.png
---

The [composer cache](/2015/07/composer-cache-on-travis/) greatly speeds up your composer part of the build by only going to Github for new downloads. When combined with [test lowest, current, and highest possible on Travis](/2015/06/test-lowest-current-and-highest-possible-on-travis/) you only reach out to Github for new versions. Most likely to happen during the `highest possible` set of builds, but also when you've updated `composer.*`. This normally isn't an issue unless you hit Github's [rate limit](https://developer.github.com/v3/#rate-limiting). And since composer is running on a 'public' travis box with a 'public' IP address that has been use by many builds before it there is a very very high chance it already hit the 60 requests per hour limit. 

![Composer Github auth error](/images/posts/composer-github-auth-error.png)

<!-- More -->

##### The setup #####

To counter this problem we have to set a Github authentication token as environment variable in Travis for each project. And update `.travis.yml` so the token is used by composer.  

##### Obtaining a Github token #####

To get started log into Github and go to settings:

![](/images/posts/github-settings.png)

Once your on your settings page go to **Personal access tokens** and click the **Generate new token** button. On the next screen make sure no scope is checked. ([As Christophe pointed out in the comments public repositories are readable publicly anyway so no need for any extra scopes.](https://developer.github.com/v3/oauth/#scopes)) 

![](/images/posts/github-new-token.png)

##### Add token to Travis #####

Now that we have a token go to the project you want to use it with on Travis and open the settings page:

![](/images/posts/travis-settings.png)

Create a new environment variable named `GH_TOKEN` and the Github token you generated earlier as its value:

![](/images/posts/travis-add-token.png)

##### Updated .travis.yml #####

The last step in this is to add `composer config github-oauth.github.com ${GH_TOKEN}` to your `.travis.yml`. For example in my case, I've wrapped it in an if to only set it when the environment variable is present:

```yaml
## Update composer and run the appropriate composer command
before_script:
  - composer self-update -q
  - if [ -n "$GH_TOKEN" ]; then composer config github-oauth.github.com ${GH_TOKEN}; fi;
  - if [ -z "$dependencies" ]; then composer install; fi;
  - if [ "$dependencies" = "lowest" ]; then composer update --prefer-lowest -n; fi;
  - if [ "$dependencies" = "highest" ]; then composer update -n; fi;
  - composer show -i
```

##### Conclusion #####

Setting up your TravisCI builds with a Github auth token will make sure you can always download the required version of a package. (Unless you manage to make more then 5,000 authenticated requests in an hour.)
