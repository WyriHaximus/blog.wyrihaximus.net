---
layout: post
title: "Deploying Sculpin to S3 with CircleCI"
date: 2016-06-16 09:12dw
comments: true
categories:
- PHP
- Sculpin
- CircleCI
tags:
- PHP
- S3
- AWS
- Sculpin
- CircleCI
- Deployment
social:
  image_relative: /images/posts/IQn4hLR.png
---

Untill 10 minutes before the start of this month I had a [VPS at Digital Ocean](https://m.do.co/c/7493728c79e4) running with [Jenkins](https://jenkins.io/) and [Gitolite](http://gitolite.com/) on it for privately hosted repositories. [With Github's recent move to unlimited repositories](https://github.com/blog/2164-introducing-unlimited-private-repositories) I realy didn't have a need to host them myself anymore, and after playing with [CircleCI](https://circleci.com/) it didn't make any sense anymore to keep that VPS up.

![Deployment](/images/posts/IQn4hLR.png)

<!-- More -->

Since porting git over to another [remote](https://help.github.com/articles/pushing-to-a-remote/) is as more Github's domain we're focussing on deploying [Sculpin](https://sculpin.io/) to [S3](https://aws.amazon.com/s3/) using [CircleCI](https://circleci.com/) in this post.

# Prerequisites

* A sculpin blog on Github, in my case that was simple because [I already put my blog on github](https://github.com/WyriHaximus/blog.wyrihaximus.net) a whole ago so others could send PR's
* A S3 bucket setup to use
* A special IAM User and it's keys just for this project and deploying with 

To get started make sure your blog is on github, and that you have create a new build/project in CircleCI.

# IAM User

We need an [IAM User](https://aws.amazon.com/documentation/iam/) to access the bucket securely. I'm leaving the correct permissions up to you as they might differ on a specific case basis. What we do need are the key and secret for the user. Enter those under `Project Settings` -> `Permissions` -> `AWS Permissions`.

![AWS Permissions](/images/posts/x0Yxtgo.png)

# circle.yml

Next up is creating a `circle.yml` file that will instruct [CircleCI](https://circleci.com/) what to do when we push commits or create tag.

First we need to tell it that we use [`PHP`](https://php.net), and since I prefer things to be bleeding edge we'll be using PHP 7 here:
```yaml
machine:
  php:
    version: 7.0.4
```

We also cache the vendor directory for a quick composer install in case nothing changed and composer's cache directory in case we need to install new packages/updated/downgraded packages we might have in cache:
```yaml
dependencies:
  cache_directories:
    - vendor
    - ~/.composer/cache
```

CircleCI assumes that every build runs tests. In case of PHP projects it will attempt to run [`phpunit`](https://phpunit.de/) but I'm using [`GrumPHP`](https://github.com/phpro/grumphp) for my blog as very simple unit tests have been added and I'm working on a linter for Sculpin that ensure it catches issues before generation. Since all my posts these days are written using pull requests, [so is this post](https://github.com/WyriHaximus/blog.wyrihaximus.net/pull/9), the linter will catch any issues while working on it.
```yaml
test:
  pre:
    - mkdir -p $CIRCLE_TEST_REPORTS/phpunit
  override:
    - ./vendor/bin/grumphp run
  post:
    - cp /tmp/junit.xml $CIRCLE_TEST_REPORTS/phpunit/junit.xml
```

Deployment settings are what controlls when you publish changes. In my setup I [tag releases](https://github.com/WyriHaximus/blog.wyrihaximus.net/tags) for deployment. Another way would be a special deployment branch but I find this easier to manage. [It is up to you how you prefer to deploy, CircleCI has you covered.](https://circleci.com/docs/configuration/#deployment)
```yaml
deployment:
  production:
    tag: /.*/
    commands:
      - vendor/bin/sculpin generate --env=prod || ( echo "Could not generate the site" && exit )
      - aws s3 sync output_prod/ s3://the-s3-bucket-name/
```

When combining that we come to the final result:
```yaml
machine:
  php:
    version: 7.0.4
dependencies:
  cache_directories:
    - vendor
    - ~/.composer/cache
test:
  pre:
    - mkdir -p $CIRCLE_TEST_REPORTS/phpunit
  override:
    - ./vendor/bin/grumphp run
  post:
    - cp /tmp/junit.xml $CIRCLE_TEST_REPORTS/phpunit/junit.xml
deployment:
  production:
    tag: /.*/
    commands:
      - vendor/bin/sculpin generate --env=prod || ( echo "Could not generate the site" && exit )
      - aws s3 sync output_prod/ s3://the-s3-bucket-name/
```
