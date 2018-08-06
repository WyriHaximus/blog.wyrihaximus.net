---
layout: post
title: "SSH jump hosts on CircleCI 2.0"
date: 2018-07-06 13:37dw
comments: true
categories:
- SSH
- CircleCI
tags:
- SSH
- CircleCI
- OpenVPN
- ZeroTier
---

While most of the projects/websites/services I work on run in the cloud or on bare metal servers in a datacenter. Some 
projects run at home with no 100% reliable way to always have the same IP available. (Plus I don't like opening ports 
for SSH to machines inside my personal network.) To work around that we're going through how to use a jump host on [`CircleCI`](https://circleci.com/) 2.0.

<!-- More -->

# SSH jump hosts

At the code of this post is SSH's ability to let a SSH server function as a jump host. More details can be found on the 
[`sshmenu`](http://sshmenu.sourceforge.net/articles/transparent-mulithop.html) site. In this post we will be taking the 
following route: `circleci` =open Internet=> `puddlejumper` =VPN=> `nas`.

# Prepping SSH

Before we start we need a few things:

* A public/private SSH key pair, [`Github`](https://www.github.com/) has a 
[good article how to generate those](https://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/)
* A user on `puddlejumper`, we've going to name it `circleci` (because that's who is logging in)
* A VPN between `puddlejumper` and `nas`, now this is a personal thing and I'll let you figure it out. (For keeping it 
all your own look at [`OpenVPN`](https://openvpn.net/) for ease of use check out [`ZeroTier`](https://www.zerotier.com/))

First, add the private key to your project on CircleCI under `Settings` => `Permissings` => `SSH Permissions`. Leave 
the host blank and add the contents of the private part of the key in the bottom field:
![CircleCI add private SSH key](/images/posts/circleci-add-private-ssh-key.png) 

Second, add the public part of the key to `.ssh/authorized_keys` for the users we're connecting t(hr)o(ugh).

# ssh.config

Next we need to create a file to put in `~/ssh/config`, we'll name it `ssh.config` in our repository and configure 
copying over to the right location in the next section.

```
Host puddlejumper
  StrictHostKeyChecking=no
  UserKnownHostsFile=/dev/null
  User circleci
  HostName puddlejumper

Host nas
  StrictHostKeyChecking=no
  UserKnownHostsFile=/dev/null
  User minion
  ProxyCommand ssh -q circleci@puddlejumper nc -q0 1.2.3.4 22
```

The file contains two `Host` sections. One for `puddlejumper` and one for `nas`. As you might have noticed the first 
two lines in both hosts disable checking the host signature. This has some security drawbacks but was necessary for 
my set up to work due to (yor mileage may vary depending on your configuration):
![CircleCI host signature error](/images/posts/circleci-host-signature-error.png)

On the host `nas` is where the magic really happens, we defined a `ProxyCommand` there that is executed when we try to 
connect to `nas`. The command will make a connection to `puddlejumper` and route our connection to `nas` over it. You 
might have noticed the IPv4 `1.2.3.4` there. They is the IPv4 of `nas` within the VPN and we use it to connect with it 
directly as there is no DNS entry for `nas`.

# .circleci/config.yml

This is my `.circleci/config.yml`, there is a lot going on, but the most important line is `- run: cat ~/repo/.circleci/ssh.config >> ~/.ssh/config` 
which puts the SSH config in the right location right before deploying the code using [`ansistrano`](https://github.com/ansistrano/deploy). 

```yaml
version: 2
jobs:
  deploy:
    docker:
      - image: ansible/ansible:ubuntu1604
        environment:
          ANSIBLE_HOST_KEY_CHECKING: no
    working_directory: ~/repo
    steps:
      - checkout
      - attach_workspace:
          at: ~/repo
      - run: cat ~/repo/.circleci/ssh.config >> ~/.ssh/config
      - run:
          name: Install System Packages
          command: pip install ansible
      - run: ansible-galaxy install -r .circleci/requirements.yml
      - run: ANSIBLE_FORCE_COLOR=true ansible-playbook -i .circleci/hosts.ini .circleci/deploy.yml
```

Now when `CircleCI` executes `- run: ANSIBLE_FORCE_COLOR=true ansible-playbook -i .circleci/hosts.ini .circleci/deploy.yml` 
`ansistrano` will connect to `nas` through `puddlejumper` and the VPN between them and run it's deployment instructions there.

# Conclusion

SSH jump hosts can be incredible useful for reaching boxes normally not directly accessible from the internet. For me 
using them helps me deploy inside my home and garden.
