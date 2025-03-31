---
layout: post
title: "Announcing TestInfra Action"
date: 2025-03-31 13:37dw
comments: true
categories:
- GitHub Actions
- Github
- Docker
- Testing
tags:
- GitHub Actions
- Github
- Docker
- Testing
- OCI
social:
  image_relative: /images/posts/test-infra-output.png
---

One of the key parts of [`Building Secure Images with GitHub Actions`](https://blog.wyrihaximus.net/2024/10/building-secure-images-with-github-actions/) 
is unit testing the image just built. While for most of my repositories this has been some bash script in the repo that 
I copied to the next new repo. Always had the desire to make something more clean than that, this action is the outcome 
of that desire.

So here it is the: [`TestInfra Action`](https://github.com/marketplace/actions/testinfra-action).

![TestInfra output](/images/posts/test-infra-output.png)

<!-- More -->

# Requirements

With GitHub just barely offering `arm` runners recently, while `x64` runners have been the only option until then. 
(Unless you get the runner software running beyond those two, or use the self hosted Kubernetes runner with only 
supports `arm` and `x64`.) Creating images for both isn’t complicated, and covered in 
[`Building Secure Images with GitHub Actions`](https://blog.wyrihaximus.net/2024/10/building-secure-images-with-github-actions/), 
but to keep maintenance as simple as possible for future CPU architectures I’ve started working on 
[`wyrihaximus/github-action-oci-image-supported-platforms`](https://github.com/WyriHaximus/github-action-oci-image-supported-platforms). 
As a result of that action I don’t have to manually update a matrix for any new CPU arch in the future, it just builds 
all those that are also available upstream. While all of this is no direct requirement for the action, it is for the 
OCI image the action utilizes to run [TestInfra](https://testinfra.readthedocs.io/en/latest/). And as a result of that, 
this action inherits all the CPU archs that image can run on, and is tested on by itself.

Another major requirement is that it should be easy to use. This resulted in some challenges but was successfully achieved.

# Challenges

The biggest issue I had while creating this action was to keep the container running. Not because it was hard to do, 
but because I had to realise it depends on each image if it keeps running after being started or not. The 
[original](https://github.com/usabilla/php-docker-template/blob/1e379cfdb90f9b03b4e4e4c6b7212134091040ce/test-cli.sh#L24) 
I took this from, [copied](https://github.com/WyriHaximusNet/docker-php/blob/345e0fca8d7b2099fef71af2c244c7b70f800107/test-zts.sh#L42) 
over again and again, and then taking the script and putting it in this action; took care of that. This is why the 
action has a `cmd` for image that require that. Something that keeps running like `PHP` or `nodejs` REPL is good enough.

The coming challenge is going to be updating my [PHP Docker](https://github.com/WyriHaximusNet/docker-php) workflow. 
It’s built to test all different tags build in a single build run, this action isn’t very keep on that. It can only 
handle a single test suite for the images you pass it. So no looping or any of that, going to have to do a major 
overhaul of that workflow. But hopefully this refactor is one I can use in my other image building workflows until the 
point I can have one general one as a reusable workflow.

# Conclusion

All of this make the action come down to invocation is, taking resolved variables for 
[`WyriHaximusNet/docker-github-action-runner`](https://github.com/WyriHaximusNet/docker-github-action-runner):

```yaml
- uses: WyriHaximus/github-action-testinfra@v1
  with:
    image: wyrihaximusnet/github-action-runner:linux-amd64
    flags: --platform="linux/arm64"
    cmd: node
    testsPath: test
```

Which will run the following tests in `test/test_node20.py`:

```python
import pytest

def test_node20(host):
    assert 'v20.' in host.run('node -v').stdout
```

Obviously there are more tests in that repository, and several times more in 
[`WyriHaximusNet/docker-php`](https://github.com/WyriHaximusNet/docker-php/tree/master/test/container).

This action is going to make maintaining and ensuring functionality of my own images a whole lot easier, and I hope it 
will helps others as well.
