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

Until 10 minutes before the start of this month I had a [VPS at Digital Ocean](https://m.do.co/c/7493728c79e4) running with [Jenkins](https://jenkins.io/) and [Gitolite](http://gitolite.com/) on it for privately hosted repositories. [With Github's recent move to unlimited repositories](https://github.com/blog/2164-introducing-unlimited-private-repositories) I really didn't have a need to host them myself anymore, and after playing with [CircleCI](https://circleci.com/)'s free tier it didn't make any sense anymore to keep that VPS up.

![Deployment](/images/posts/IQn4hLR.png)

<!-- More -->

Since porting git over to another [remote](https://help.github.com/articles/pushing-to-a-remote/) is as more Github's domain we're focusing on deploying [Sculpin](https://sculpin.io/) to [S3](https://aws.amazon.com/s3/) using [CircleCI](https://circleci.com/) in this post.

# Prerequisites

* A Sculpin blog on Github, in my case that was simple because [I already put my blog on github](https://github.com/WyriHaximus/blog.wyrihaximus.net) a whole ago so others could send PR's
* A S3 bucket setup to use
* A special IAM User and it's keys just for this project and deploying with CircleCI that has access to the S3 bucket containing the blog

To get started make sure your blog is on Github, and that you have create a new build/project in CircleCI.

# IAM User

We need an [IAM User](https://aws.amazon.com/documentation/iam/) to access the bucket securely. I'm leaving the correct permissions up to you as they might differ on a specific case basis. What we do need are the key and secret for the user. Enter those under `Project Settings` -> `Permissions` -> `AWS Permissions`.

![AWS Permissions](/images/posts/x0Yxtgo.png)

# circle.yml

Next up is creating a [`circle.yml`](https://circleci.com/docs/configuration/) file that will instruct [CircleCI](https://circleci.com/) what to do when we push commits or create tag.

First we need to tell it that we use [`PHP`](https://php.net), and since I prefer things to be bleeding edge we'll be using PHP 7 here:
```yaml
machine:
  php:
    version: 7.0.4
```

## Dependencies

We also cache the vendor directory for a quick composer install in case nothing changed and composer's cache directory in case we need to install new packages/updated/downgraded packages we might have in cache. CircleCI takes care of running `composer install` for us. Unless we like to add extra flags we have no need to overwrite that:
```yaml
dependencies:
  cache_directories:
    - vendor
    - ~/.composer/cache
```

## Tests

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
The `pre` and `post` are there to inform CircleCI of our tests results and show us information about it like this:

![jUnit result](/images/posts/nl1c9KO.png)

## Deployment

Deployment settings are what controls when you publish changes. In my setup I [tag releases](https://github.com/WyriHaximus/blog.wyrihaximus.net/tags) for deployment. Another way would be a special deployment branch but I find this easier to manage. [It is up to you how you prefer to deploy, CircleCI has you covered.](https://circleci.com/docs/configuration/#deployment) 

Once a tag has been created the commands kick into action. The first command will generate the blog or display an error when it fails. The second command syncs the generated site to S3. The interesting bit about the `aws` command is that it is installed by default in the build container and uses the credentials we set earlier in this post.
```yaml
deployment:
  production:
    tag: /.*/
    commands:
      - vendor/bin/sculpin generate --env=prod
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
      - vendor/bin/sculpin generate --env=prod
      - aws s3 sync output_prod/ s3://the-s3-bucket-name/
```

# Conclusion

CircleCI makes deploying to AWS S3 simple and easy with integrated option to set keys and pre-installed `AWS` command. This doesn't just work for a PHP based static site generator but with a few tweaks it works just as easy with generators for other languages.
