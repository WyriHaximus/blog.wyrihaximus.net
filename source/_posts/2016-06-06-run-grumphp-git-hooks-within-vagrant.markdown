---
layout: post
title: "Run GrumPHP git hooks within Vagrant"
date: 2016-06-06 21:12dw
comments: true
categories:
- PHP
- GrumPHP
tags:
- PHP
- GrumPHP
- git
- vagrant
- SSH
social:
  image_relative: /images/posts/grumphp-grumpy.png
---

A couple of weeks back while attending [AmsterdamPHP](https://php.amsterdam/) [Mike Chernev](https://twitter.com/MikeChernev) gave a talk about [GrumPHP](https://github.com/phpro/grumphp). Very cool looking tool, but during implementation I found out it the default setup assumes running grumphp on the same machine (whether that is a VM or iron) as committing. That is a problem in my set up where all `PHP` related code runs in vagrant and comitting on the host using PHPStorm. Lets fix that. 

![GrumPHP from grumpy to happy](/images/posts/grumphp-grumpy-to-happy.gif)

<!-- More -->

Running GrumPHP within vagrant from the host is just a matter of appending the [`--command`](https://www.vagrantup.com/docs/cli/ssh.html#_c_COMMAND) argument to [`vagrant ssh`](https://www.vagrantup.com/docs/cli/ssh.html):

```bash
vagrant ssh --command "./vendor/bin/grumphp run"
```

And creating the following git hooks needed to do the full GrumPHP within vagrant instead of the host machine. Took a little bit of research into to turn the stock hooks into ones that run everything within vagrant. (Note that your path might vary, and that these hooks are my initial proof of concept hooks.)

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

But getting GrumPHP to install those hooks during install ([`grumphp git:init`](https://github.com/phpro/grumphp/blob/master/doc/commands.md#installation)) required a relatively small change in the code. After some digging around in the code, I crafted a [PR](https://github.com/phpro/grumphp/pull/143) that adds the posibility to overwrite the default git hook template location.

With that PR tagged in [`0.9.1`](https://github.com/phpro/grumphp/releases/tag/v0.9.1) you can now drop the above hooks (titles are the filenames) in a dedicated folder it to your `grumphp.yml`. Lets say your folder is `./config/grumphp/hooks/` the config looks like this using the [`hooks_dir`](https://github.com/phpro/grumphp/blob/master/doc/parameters.md) parameter:

```yml
parameters:
  hooks_dir: ./config/grumphp/hooks/
```

# But wait it gets better

During the course of the [PR](https://github.com/phpro/grumphp/pull/143#issuecomment-217776465) the idea came up to not only make the hooks directory configuratable but to also include the vagrant hooks. That resulted in two presets: `local` and `vagrant`. The default preset is `local` while you can set `vagrant` using the [`hooks_preset`](https://github.com/phpro/grumphp/blob/master/doc/parameters.md) This should make it even easier to use GrumPHP as your code quality tool when using vagrant.

In your `YAML` set the `hooks_preset` to `vagrant` instead of `local` and hooks for running everything inside vagrant are used instead. (Note that these are more sophisticated hooks then mine earlier in this post.)

```yml
parameters:
  hooks_preset: vagrant
```

# Gotchas

To make the vagrant setup work correctly you have to ensure GrumPHP has access to your `.git` directory. This can be set using the [`git_dir`](https://github.com/phpro/grumphp/blob/master/doc/parameters.md) parameter. Also you might have to add
`cd /your/project` to your `.bashrc`. (See the documentation for [`hooks_preset`](https://github.com/phpro/grumphp/blob/master/doc/parameters.md) on that.) And finally vagrant has to be running, otherwise `vagrant ssh` will fail with an error. 

# Conclusion 

[Toon](https://github.com/veewee) did a lot of great work ensuring that the `hooks_presets` work on most systems. The `hooks_dir` gives you a way to costumize your hooks when the `hooks_preset` doesn't work out in your environment. The time it takes to login and run grumphp over just running grumphp locally is negligible. So if your project runs on vagrant using GrumPHP just got easier.
