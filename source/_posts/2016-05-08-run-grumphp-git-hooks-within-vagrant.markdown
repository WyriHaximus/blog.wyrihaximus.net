---
layout: post
title: "Run GrumPHP git hooks within Vagrant"
date: 2016-05-08 21:12dw
comments: true
categories:
- PHP
- GrumPHP
tags:
- PHP
- GrumPHP
- git
- vagrant
- ssh
social:
  image_relative: /images/posts/grumphp-grumpy.png
---

A couple of weeks back when attending [AmsterdamPHP](https://php.amsterdam/) [Mike Chernev](https://twitter.com/MikeChernev) gave a talk about [GrumPHP](https://github.com/phpro/grumphp). Very cool looking tool, but during implementation I found out it the default setup assumes running grumphp on the same machine (whether that is a VM or iron) as committing. That is a problem in my set up where all `PHP` related code runs in vagrant and comitting on the host using PHPStorm. Lets fix that. 

![GrumPHP from grumpy to happy](/images/posts/grumphp-grumpy-to-happy.gif)

<!-- More -->

Running GrumPHP within vagrant from the host is just a matter of appending the `--command` argument to `vagrant ssh`:

```bash
vagrant ssh --command "./vendor/bin/grumphp run"
```

And creating the following git hooks needed to do the full GrumPHP within vagrant instead of the host machine. Took a little bit of research into to turn the stock hooks into ones that run everything within vagrant.

## commit-msg
```bash
#!/bin/sh

GIT_USER=$(git config user.name)
GIT_EMAIL=$(git config user.email)
COMMIT_MSG_FILE=$1

vagrant ssh --command "./vendor/bin/grumphp git:commit-msg '--git-user=$GIT_USER' '--git-email=$GIT_EMAIL' '$COMMIT_MSG_FILE'"
```

## pre-commit
```bash
#!/bin/sh
vagrant ssh --command "./vendor/bin/grumphp git:pre-commit --skip-success-output"
```

But getting GrumPHP to install those hooks during install (`grumphp git:init`) required a relatively small change in the code. After some digging around in the code, I crafted a [PR](https://github.com/phpro/grumphp/pull/143) that adds the posibility to overwrite the default git hook template location.

[I'm aware this PR hasn't merged yet but prepping the post for that situation. Assuming it gets merged and tagged]
With that PR tagged in `0.9.x` you can now drop the above hooks (titles are the filenames) in a dedicated folder it to your `grumphp.yml`. Lets say your folder is `./config/grumphp/hooks/` the config looks like this:

```yml
parameters:
  hooks_dir: ./config/grumphp/hooks/
```
