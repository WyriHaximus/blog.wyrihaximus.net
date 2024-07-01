---
layout: post
title: "Building a kubernetes homelab with Raspberry Pi and Lego: Network: Switch"
date: 2024-07-01 13:37dw
comments: true
categories:
- Kubernetes
- Homelab
- "Homelab: Network"
tags:
- Kubernetes
- Homelab
- "Homelab: Network"
- Lego
- Raspberry Pi
- Networking
- Switch
- PoE+
social:
  image_relative: /images/posts/k8s-lego-home-cluster/network/switch/front-view-of-how-the-switch-is-situated-now.jpg
---

At the core of the cluster, at least at the start of the project, is an 8 port PoE+ switch. The 
[`Ubiquiti US 8 150W`](https://eu.store.ui.com/eu/en/products/us-8-150w) to be exact. The main goal of that switch is 
to power the nodes over PoE+. At this point this switch only power the autoscaleable nodes, all 3 control plane nodes 
are on 2 other switches.

![The switch when it initially all started](/images/posts/k8s-lego-home-cluster/network/switch/switch-when-it-all-initially-started.jpg)

<!-- More -->

This specific switch was picked for two reasons:

* It does PoE+ and matched what the PoE+ HAT for the nodes needed
* Ports can be turned on and off through an API

Since I was already running Unifi for my entire network the US 8 150W is a perfect fit. Due to being positioned between 
the home office switch and network core switch it uses 4 of it’s 10 ports for a trunk of two cables to each of those 
switches. Leaving me with 6 ports for the node. Which is perfect for the MoC theme I’m doing.

![The switch switch location marked in the rest of the network](/images/posts/k8s-lego-home-cluster/network/switch/location-of-us-8-150w-in-network.jpg)

The switch is build into the MoC on a raise so there is room for cables and airflow for cooling underneath it. Since 
it’s in the attic, the hottest place in the house, that extra space is very welcome.

![The cables under the switch](/images/posts/k8s-lego-home-cluster/network/switch/the-cables-under-the-switch.jpg)

This switch, while crucial for the cluster. Not a very interesting topic to write about, same us the node’s storage and 
power supply. It, and they, are a very crucial part of the cluster.

![Front view of how the switch is situated now](/images/posts/k8s-lego-home-cluster/network/switch/front-view-of-how-the-switch-is-situated-now.jpg)
