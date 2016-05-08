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
---

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
