---
layout: post
title: "Using GitHub private images on your Kubernetes on DigitalOcean (DOKS) 1.20 cluster"
date: 2021-02-05 13:37dw
comments: true
categories:
- GitHub 
- Digitalocean
- Kubernetes
tags:
- PHP
- Kubernetes
- FPM
- Metrics
social:
  image_relative: /images/posts/kubernetes-1.20-chaos.jpg
---

Started the upgrade for my Kubernetes cluster on DigitalOcean earlier tonight, previous upgrades ran without issues, 
but this time it took a dark turn. In a nutshell, if you have private Docker images hosted at `docker.pkg.github.com` 
migrate them to `ghcr.io`.

![Kubernetes 1.20 Chaos](/images/posts/kubernetes-1.20-chaos.jpg)

<!-- More -->

# The cause

In kubernetes `1.20` `Docker` has been depricated and replaced with `containerd`. This on it's own isn't a change that 
worried me. However, it turned out to be incompatible with images hosted on `docker.pkg.github.com`, much to my 
surprise. This resulted in all my projects getting stuck in the `ImagePullErr` phase on the new nodes. 
Started digging around after accepting it wasn't a weird config glitch. After a while I found that there 
are slight differences between `Docker` and `containerd` when it comes to pulling images and supported versions. Long 
story short `containerd` doesn't support what ever runs `docker.pkg.github.com`. Since I already have a few public 
images on `ghcr.io` (also by `GitHub`), and those are also running in my cluster, and where pulling fine, I decided to 
retag and push one image there. Same frantic typing later I updated the image pull secret, and had the image for a 
deployment on `ghcr.io` privately and secure behind authentication. The pod got created, and came back up.

# The hotfix

Start with updating your Docker credentials secret, and swap out `docker.pkg.github.com` with `ghcr.io` as your 
`docker server`. This is required as your images will be used on a new registry, even though there are both on 
`GitHub`.

Then, start pulling, retagging, and pushing your container images:

```bash
docker pull docker.pkg.github.com/LOGIN/IMAGE/IMAGE:TAG
docker tag docker.pkg.github.com/LOGIN/IMAGE/IMAGE:TAG ghcr.io/LOGIN/IMAGE:TAG
docker push ghcr.io/LOGIN/IMAGE:TAG
```

# The permanent fix

Obviously the above is to hot patch the situation. Now I get to update all my GitHub Actions workflows to push to the 
new registry, test my clean up script etc etc. But I can prototype and test that on one project, and then copy paste 
it to the rest.

# Conclusion

While I totally don't core that  they swapped `Docker` with `containerd` in `Kubernetes` 1.20, it would have been nice 
if `DigitalOcean` is going to update their linter with a warning about this. This is partially why I enjoy running the 
latest versions of almost everything: shit breaks and I have to fix it, learning new things in the frustrating but 
rewarding process.
