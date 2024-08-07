---
layout: post
title: "Building a kubernetes homelab with Raspberry Pi and Lego: Nodes: Storage"
date: 2024-08-01 13:37dw
comments: true
categories:
- Kubernetes
- Homelab
- "Homelab: Nodes"
tags:
- Kubernetes
- Homelab
- "Homelab: Nodes"
- Lego
- Raspberry Pi
- USB
- SATA
- M.2
- SSD
social:
  image_relative: /images/posts/k8s-lego-home-cluster/nodes/storage/a-stack-of-storage-waiting-to-be-reimaged.jpg
---

When starting out with k3s my plan was to use my NAS for all the node’s storage needs. Looked at iSCSI, LUN’s, TFTP, 
fancy DHCP options and everything. But I’ve settled with USB ↔ SATA, M.2, and even an SDCard in one node for storage.

![A stack of storage waiting to be reimaged](/images/posts/k8s-lego-home-cluster/nodes/storage/a-stack-of-storage-waiting-to-be-reimaged.jpg)

<!-- More -->

The main goal with looking at anything but SDCards was not to use SDCards. Mainly because those aren’t made to run 
24/7 for years with lots of reads and writes. Ended up settling for the USB ↔ SATA because it’s the cheapest adding 
€ 15 for the adapter and € 40 for the SSD to the cost of each node.

## USB ↔ SATA

The USB ↔ SATA set up is the reason my lego enclosures are as big as they are. They are put in diagonally, and the 
initial reason behind doing that was so you can use it to direct airflow. That doesn’t matter anymore with the big 
fan on the front. But it is still a convenient way of putting them in.

![The SATA SSD in an earlier version of the LEGO node enclosure](/images/posts/k8s-lego-home-cluster/nodes/storage/the-sata-ssd-in-an-earlier-version-of-the-lego-node-enclosure.jpg)

The set up consists of two parts, a 2.5” SSD and a USB ↔ SATA adapter. So far I’ve been using 250GB SSD’s because 
nothing permanent is stored on the nodes. The only thing persistent on them is the OS and it’s configuration. And even 
those are easy replaceable. Service data on the other hand is not.

![The parts that make up the USB SATA storage](/images/posts/k8s-lego-home-cluster/nodes/storage/the-parts-that-make-up-the-usb-sata-storage.jpg)

## M.2

The M.2 nodes utilize the M.2 USB adapter build into the Argon40 cases. The adapter is replacing the non-M.2 bottom of 
the cases and you connect it through a male-male USB plug on the back of the case.

![Open Argon40 showing the M.2 SSD at the bottom](/images/posts/k8s-lego-home-cluster/nodes/storage/open-argon40-showing-the-m.2-ssd-at-the-bottom.jpg)

As with the USB ↔ SATA set up I’ve also connect it to the USB2 instead of USB3 ports for stability reasons. Used two 
short USB extension cables to achieve that, giving each node a cute little tail.

![The require tail to stabilize the storage](/images/posts/k8s-lego-home-cluster/nodes/storage/the-require-tail-to-stabilize-the-storage.jpg)

## SDCard

When adding the latest node I decided to us an old USB SSD I rediscovered and not older the USB ↔ SATA combo. Up on 
booting the device it turned out the SSD in there was so bad it couldn’t even boot. Not waiting to wait I put a random 
SDCard in it (since I have to many random of those) and YOLO it to see how long it would take before that started 
crapping out. It’s been months at this point. Might consider 
[`WD Purple SDCards`](https://www.westerndigital.com/en-gb/products/memory-cards/wd-purple-microsd?sku=WDD256G1P0C) 
as I’ve been using one of those for our 
doorbell.