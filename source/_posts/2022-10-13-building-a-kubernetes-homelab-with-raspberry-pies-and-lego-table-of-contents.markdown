---
layout: post
title: "Building a kubernetes homelab with Raspberry Pi and Lego: Table of contents"
date: 2022-10-13 13:37dw
comments: true
categories:
- Kubernetes
- Homelab
tags:
- Kubernetes
- Homelab
- Lego
- Raspberry Pi
social:
  image_relative: /images/posts/k8s-lego-cluster-toc.jpg
---

For years I've been using Raspberry Pi's to do in home automation. One of the major constraints was maintenance, if
one goes down I have to look at it while things are down. This made running Home Assistant less than ideal. After
working with Kubernetes for a few years I decided to bring it into my home permanently. But with a challenge, by
using Lego. During the Pandemic we got back into building Lego and this is a way for me to bring my Lego skills to
the next level.

The post is probably the most boring one as it is the table of contents. However, it will be updated every time a new
post is published. Also, posts won't be written in a logical order but more in order of the things that are already
done. As such the "Home Assistant" post will come before the "Node Software set up" post because the former can be done
again without changes or data loss due to the "Terraform" and "Storage" posts.

![Waved fibers into a near pattern](/images/posts/k8s-lego-cluster-toc.jpg)

<!-- More -->

## Management

* TerraForm
* Node autoscaling

## Network

* Switch
* Configuration

## Supportive hardware

* Persistent Data Storage
* Cooling

## Nodes

* Power
* Storage
* Kubernetes

## Enclosure

* Node enclosure
* MoC Theme
* Cable management

## Services

* GitHub Actions Runners
* Home Assistant & Node Red
* RabbitMQ
