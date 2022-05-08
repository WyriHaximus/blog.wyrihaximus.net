---
layout: post
title: "Building fast Docker based GitHub Actions"
date: 2022-05-03 13:37dw
comments: true
categories:
- GitHub Actions
- Docker
tags:
- GitHub Actions
- Docker
social:
  image_relative: /images/posts/php-8.1-fibers-cancelled.jpg
---

My biggest petpeve with using Docker based GitHub Actions is that not all of them run from a tagged Docker image, and
as such tend to have slow start up times. This results in the image being build every single run of that action, which
is a slow wasteful process to repeat every single time. An alternative title for this post could be `Building greening
Docker based GitHub Actions` due to all the CPU cycles and energy wasted by doing so.

Been thinking about writing this post for a while now, and Erika's excellent post about using PHP to create GitHub
Actions finally pushed me to do it. And also to have a good look at my current set up, triggering the move to GitHub's
container registry. This post will assume you know how to create actions using PHP, or any other language that requires
to use Docker.

![Cancelled PHP 8.1 fibers (green threads)](/images/posts/php-8.1-fibers-cancelled.jpg)
> [Photo by Jeffrey Czum from Pexels](https://www.pexels.com/photo/concrete-building-under-blue-sky-4004291/)

<!-- More -->

# Looking back at using Docker Hub

My initial set up, and the current set up until I started the migration the same day I started writing this post, is
through Docker Hub. At the time GitHub Actions came became available GitHub's container registry was non-existant. So I
went with `wyrihaximusgithubactions` as Docker Hub org for security reasons.

# Building, pushing, and running from to GitHub's container registry
# Bonus: CVE scanning
# Bonus: ARM(64) images
# Conclusion

Building and hosting a ready to use image cuts you set up time from 10+ seconds - minutes, all the way to 5, maybe 10 seconds max.
