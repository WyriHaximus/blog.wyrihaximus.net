---
layout: post
title: "Building a kubernetes homelab with Raspberry Pi and Lego: Nodes: Enclosure"
date: 2024-12-14 13:37dw
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
- PoE+
- PoE HAT
- SATA
- SSD
- FAN
social:
  image_relative: /images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/blades.png
---

One of the main concerns with using LEGO to build enclosures for the nodes is safety. Raspberry Pies can get hot, and 
no one wants things to go ablaze. So I, after a few iterations, designed the enclosures with plenty of room for moving 
air around and through the nodes. And in theory that can be stacked on each other. With a big fan on the front to keep 
it cool.

![A Render of all 6 nodes in their LEGO blades](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/blades.png)

<!-- More -->

The enclosures have seen a few interesting iterations. Starting with a ‘I have no idea what I’m doing!” to a design 
that takes into account heat source location, airflow, expansion options, and mobility options.

[![Photo of the first iteration enclosure](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/first-iteration.jpg)](https://toot-toot.wyrihaxim.us/@wyri/109864854686130533)

The second iteration wasn’t that much better but an attempt was made to at least tries something, although I don’t 
remember what exactly…:

[![Photo of the second iteration enclosure](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/second-iteration.jpg)](https://toot-toot.wyrihaxim.us/@wyri/109874378403453527)

The third iteration builds onto the second and gets every more compact:

[![Photo of the third iteration enclosure](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/third-iteration.jpg)](https://toot-toot.wyrihaxim.us/@wyri/109910555815902788)

When I found out about the [`FRAME 11X15`](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&designNumber=39790&includeOutOfStock=true&selectedElement=6245375) 
being a little bit bigger than a Raspberry Pi board I had to try it out:

[![Photo of the forth iteration enclosure](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/forth-iteration-test.jpg)](https://toot-toot.wyrihaxim.us/@wyri/109932365562901320)

This ultimately lead to a floating board with room with additions below it. One thought was that with the SSD 
diagonally the from from the node below it would blow it’s air against it and this get rid of the hotness without 
fucking another node over with it. This was when the plan was still to create a tower, before the whole cat bed 
situation, which deserves it’s own post.

[![Photo of the forth iteration enclosure](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/forth-iteration-middle.jpg)](https://toot-toot.wyrihaxim.us/@wyri/109935750561682641)

The final iteration, whether we call it the 5th or the final 4rth iteration. But it’s ultimately a more solid version 
of the forth iteration range, with the possibility to add a big fan on the front. It also has a ton of quality of live 
improvements that make it easy to handle. It consists of 326 LEGO parts, 157 of which are short technic [pins with 
friction](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=61332&selectedElement=6279875), 
and 67 are [3L technic pins with friction`](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=42924&selectedElement=6299413)
. So out of the 326 parts, 224 are for supporting the structure while 102 are the structure.

Two of those parts are very important as they support the node, they are highlighted in red in the following render:

![Render of the the node enclosure with the two supporting pieces red and the rest transparent](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/blade-floating-supports-highlight.png)

While I write this post, I realize the axle is on a pretty cool part of the board, that I might redesign that part the 
use a beam like on the other side. Problem with the axle holder is that it’s relatively easy to push it down a bit. It 
also doesn’t fit the same aesthetic as the rest of the design.

The foundation of the design consists of 4 FRAME 11X15 with 4 [15m technic beams](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=64871). Then on both sides on all 
4 corners a L beam is put on each corner to make the structure more rigid. Initial designs used yellow pins without 
friction and that made everything very moveable. After switching to the black pegs with friction, and by putting pegs 
in every single hole possible, everything becomes fixed into place.

Using two shifted stacked [H shaped beams](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=14720) 
on the side of the 11x15 the [5m technic beam](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=32316) 
supporting the node on the SDcard side/side without any connectors. The axle hanging structure is a lot more complex 
but achieves the same thing. By this design it’s unambiguous how the node should be placed it you use any of the ports 
on the back. As these nodes are powered over PoE+. This design has been created with the assumption the network and at 
least one of the USB ports is used. But is can be easily adopted for powering the node over USB-C on the side and 
partially/fully block the other ports you don’t need to fully lock it in. At some point I had an iteration where I did 
that but with needing 3 USB ports and the RJ45 for the network that wasn’t an option.

The render below highlights a few parts of the design:

* Red: Directly supports suspending the node
* Blue: The base frame
* Green: Base frame stability support
* Yellow: Placement support, either for stacking them or putting them in a fucked location (used to make the FLIR shots later on in this post)

![Rotating GIF of the blade highlighting parts](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/blade-base-front-plus-node-supporting-parts.png)

The big fan on the way wasn’t added until I started running regular CPU heavy jobs (in the summer), and my wife 
(rightfully) complained about the high pitch noise coming from the PoE+ HAT fan spinning up. Got myself a cheap 
USB fan from Amazon to try it out:

![The first fan on a node as a cooling test](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/fan-on-node.jpg)

This turned out to be a huge success and the bigger fan was barely noticeable. That meant I had to find a good 
location and airflow direction for it. After several tries pulling air through the node works best for my situation. 
Pulling air through instead of blowing it through causes less dust to gather on the node. Decided on going with a  
[Noctua NF-A9 PWM](https://noctua.at/en/nf-a9-pwm) because it supports connecting via USB safely. Something I didn't 
realise could be an issue while doomscrolling on [Instagram](https://www.instagram.com/reel/Cu7vyaYpt3U/) one night. 
[Noctua's PWM design](https://noctua.at/pub/media/wysiwyg/Noctua_PWM_specifications_white_paper.pdf) makes sure 
[PWM](https://en.wikipedia.org/wiki/Pulse-width_modulation#Power_delivery) is handled safely with 
[their USB adapter shipped](https://noctua.at/en/noctua-expands-5v-fan-line-up-2018) with their fans.

The haul of the enclosure has room to put additional hardware such as an SATA SSD in my case for storage. The cooling 
fan cable also goes through it. On my personal list is a [USB ML Accelerator](https://coral.ai/products/accelerator/) 
so I can do some object detection on camera streams, World of Warcraft screenshots, or roads/paths/buildings on 
World of Warcraft minimaps. The Because everything is building within the four 11X15 frames you can use Technic 
lego to add any support structure you might need to secure that hardware. I my case I’m using [`TECHNIC ANG. BEAM 3X5 90 DEG.`](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=32526), 
[`LATTICE WALL 1X6X5`](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=64448), 
and [`FLAT PANEL 3X11M`](https://www.lego.com/en-nl/pick-and-build/pick-a-brick?sort=price-desc&perPage=400&includeOutOfStock=true&query=15458) 
to keep the SSD in place.

![Render of the the node enclosure with the SSD supporting pieces gold and the rest transparent](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/blade-SSD-supporting-parts.png)

## FLIR Heat testing

One thing that’s been on my list ever since I started this project was to do FLIR photo’s and videos looking into how 
much heat goes from the CPU onto the LEGO. So we could see if it could be an issue:

![A random FLIR photo of the the bottom of the Raspberry Pi Board](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/FLIR-introduction-shot.jpg)

In order to do that I borrowed an USB-C FLIR camera from a friend and build a test set up for one of the nodes that was 
temporary on an SDCard. (Otherwise the SSD would have blocked the view.) So I took `mind` a bunch of technic blocks and 
created a structure that would raise the node making it possible to place the FLIR underneath it.

![Photo of the FLIR recording set up](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/FLIR-shooting-set-up.jpg)

While the tests in this post focus on going from idle to high load, there is the cold start scenario where a node that 
is off is pulled in and gets aa high workload. The following video is a recording that starts while the node is off 
until the point it's idle. It's very clearly visible where the CPU is and how heat doesn't start at it but at some 
point it's the hottest part and head spreads from it.

<iframe width="560" height="315" src="https://www.youtube.com/embed/BavxTw9jXww?si=hFeId8rKa3s3kpSd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Image conversion and map image stitching workloads are used to keep the test within expected usage, not just run 
something that uses the full CPU of the nodes. Both are CPU bound but still partially I/O bound. The test is done twice, 
once with the big fan in front plugged in, and once without.

The test consists of the following steps:

- Start the recording in full idle
- Start the scan jobs to fill the queues
- Workers kick in and started to process the queue
- At this point, CPU temperature will begin to rise
- Once it stays at the same level for a minute the workers will stop
- CPU temperature will start going down
- Recording will be stopped once it hits the idle start temperature

### Fan OFF Test

Just before starting this test I pulled out the big fan on the front and this shows an initial lower temperature. This 
corrected itself at the end of the video and is also visible on the overview chart.

![Fan OFF Test graphs](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/fan-off-test-graphs.png)

<iframe width="560" height="315" src="https://www.youtube.com/embed/aDEf6sgxJxU?si=qtgWw9kRXIDBcypP" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### Fan ON Test

Seconds before starting the second recording I plugged the fan back in. Because the fan cools down swiftly I had a few 
pods ready on pending to kick in.

![Fan ON Test graphs](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/fan-on-test-graphs.png)

<iframe width="560" height="315" src="https://www.youtube.com/embed/FS-CMEaR6Xc?si=YVHUsqsi1fa8euMy" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### Looking back at the tests

These tests where a literal production load ran on the node that is aside from that performing idle system 
duties. (Keeping systems like one RabbitMQ node, GitHub Action Runner Scale Set Listeners listening, a Redis replica 
etc etc. Nothing major but they need to be up.) So looking at the wider graphs it's clear how adding a heady workflow 
to it doubles the power usage and adds 20 degrees to the CPU temperature.

![Fan OFF ON Test overview graphs](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/fan-off-on-test-overview-graphs.png)

## Conclusion

The hanging board design is working very well, and having the big fan at the front ensures airflow throughout the 
enclosure instead of just the PoE+ HAT cooling fan.

![Photo of the bottom pointing out the cold lego](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/bottom-support-point-out-conclusion.jpg)

It pleased very much to see both the axel and the technic beam stayed cold throughout the tests. As cold as the rest 
of the enclosure. And those are the only two parts the node touches, well should touch. This gives me faith I made the 
right calls and that it's safe to enclose these nodes into a bigger MOC without temperature issues. Of course this is 
going to be a step by step process. The first step of adding a roof has already been made:

![Photo of the roof over the nodes](/images/posts/k8s-lego-home-cluster/nodes/enclosure/lego/roof-over-nodes.jpg)
