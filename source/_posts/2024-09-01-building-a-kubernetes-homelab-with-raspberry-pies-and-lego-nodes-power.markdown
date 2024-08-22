---
layout: post
title: "Building a kubernetes homelab with Raspberry Pi and Lego: Nodes: Power"
date: 2024-09-01 13:37dw
comments: true
categories:
- Kubernetes
- Homelab
- "Homelab: Nodes"
- Shelly
tags:
- Kubernetes
- Homelab
- "Homelab: Nodes"
- Lego
- Raspberry Pi
- USB
- PoE+
- Shelly
social:
  image_relative: /images/posts/k8s-lego-home-cluster/nodes/power/a-stack-of-poe+-hats-in-their-boxes.jpg
---

To power all but the control plane nodes PoE+ is used, while control plane nodes are USB power controllable through 
Shelly plugs. Both are fully automatable through API’s and will be used by the cluster node autoscaler.

![Astack of PoE+ HATs in their boxes](/images/posts/k8s-lego-home-cluster/nodes/power/a-stack-of-poe+-hats-in-their-boxes.jpg)

<!-- More -->

## PoE+

To power the Raspberry Pi 4’s over PoE+ a PoE+ HAT is required to provide power to the board. Which adds about € 25 to 
the cost of the node, but you get to managed up to 8 of them through one device. The HAT comes with a little fan 
to cool things down when they get hotter. The LEGO enclosure nodes also got a bigger fan on the front for cooling them 
down because the HAT fan makes a high pitch when it spins up to higher RPM.

![Raspberry Pi 4 with PoE+ HAT before putting it on](/images/posts/k8s-lego-home-cluster/nodes/power/raspberry-pi-4-with-poe+-hat-before-putting-it-on.jpg)

After mounting the HAT on, all else that needs doing is plugging the network cable into the Pi and switch. (And make 
sure the port you are plugging into has PoE+ enabled.) This effectively leaves you with one cable to the node for 
power and networking. You can still plug cables into the USB ports for things like storage, ML Accelerators, LEGO 
light kits, cooling fan, etc etc.

![Raspberry Pi 4 with PoE+ HAT after putting it on](/images/posts/k8s-lego-home-cluster/nodes/power/raspberry-pi-4-with-poe+-hat-after-putting-it-on.jpg)

## USB

To power nodes over USB you need an the official Raspberry Pi USB adapter, and for control I’m using a Shelly Plug. 
Those nodes are in an Argon40 case which comes with a more powerful cooling fan then the PoE+ HAT, and a build in M.2 
slot for storage.

![The parts for an Argon40 node](/images/posts/k8s-lego-home-cluster/nodes/power/the-parts-for-an-argon40-node.jpg)

When the node is in the case, and you set the power on after power restore jumper. All is left to plug in the USB 
power cable, and make sure the plug is turned on. Same as with the PoE+ powered nodes this leaves you with 4 USB 
ports on the rear to plug additional things in. That could be a DSMR reader, or anything USB powered as long as it 
doesn’t pull more than the board can handle safely.

![Argon40 nodes in place](/images/posts/k8s-lego-home-cluster/nodes/power/argon40-nodes-in-place.jpg)

These two nodes are on the core switch because they are hooked up to my electric smart meter.

## The Hybrid

There is one hybrid node that is PoE+ powered through a Shelly Plug using a PoE+ adapter. And it is on my desk. It’s 
on a 3rd switch because I didn’t want all 3 control plane nodes on the same switch. In case there is a netsplit either 
way for the PoE+ switch, it should have at least a fallback.

![The node on my desk in the dark with a wizard on it doing magic](/images/posts/k8s-lego-home-cluster/nodes/power/the-node-on-my-desk-in-the-dark-with-a-wizard-on-it-doing-magic.jpg)