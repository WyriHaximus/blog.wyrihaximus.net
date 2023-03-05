---
layout: post
title: "Testing GitHub Actions"
date: 2023-03-03 13:37dw
comments: true
categories:
- GitHub Actions
- Github
tags:
- GitHub Actions
- Github
- Testing
social:
  image_relative: /images/posts/pexels-tima-miroshnichenko-5380642.jpg
---

When I first started creating my first GitHub Actions testing them wasn’t much of a thing. It mostly happened by doing 
some form of throwing different scenarios at it and manually looking at the result. At least that was it for me. More 
complicated actions had unit tests but no assertions on the workflow level. That changed when GitHub decided to change 
the way an action (or anything in a workflow) can set outputs.

![Testing GitHub Actions depicted as the StarGate](/images/posts/pexels-tima-miroshnichenko-5380642.jpg)
> [Photo by Tima Miroshnichenko from Pexels](https://www.pexels.com/photo/close-up-view-of-system-hacking-5380642/)

<!-- More -->

While doing the output updates I would first add “unit” tests to an action and then make the output change. For that I 
had a look around of different actions that provide assertions out of the box and settled on 
`https://github.com/nick-fields/assert-action`. Then I incorporated it into the CI workflow, which brings us to the 
following workflow:

```yaml
name: Continuous Integration
on:
  push:
    branches:
      - 'main'
  pull_request:
jobs:
  get-next-release-version:
    name: Test Get Next Release version on {{ "${{" }} matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os:
          - ubuntu-latest
          - windows-latest
          - macos-latest
    runs-on: {{ "${{" }} matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - name: 'Get Next Release version'
        id: next-release-version
        uses: ./
        with:
          version: r665
      - name: Assert Version Output
        uses: nick-fields/assert-action@v1
        with:
          expected: "666"
          actual: {{ "${{" }} steps.next-release-version.outputs.version }}
      - name: Assert R Version Output
        uses: nick-fields/assert-action@v1
        with:
          expected: "r666"
          actual: {{ "${{" }} steps.next-release-version.outputs.r_version }}
```

The top of the file is pretty standard, we only run it on the main branch or on pull requests.

```yaml
name: Continuous Integration
on:
  push:
    branches:
      - 'main'
  pull_request:

```

We have only a single job that runs on all 3 latest versions of the available hosts GitHub Actions provides out of the 
box, we will not cancel any things of one of the fails and add that to the jobs name.

```yaml
jobs:
  get-next-release-version:
    name: Test Get Next Release version on {{ "${{" }} matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os:
          - ubuntu-latest
          - windows-latest
          - macos-latest
    runs-on: {{ "${{" }} matrix.os }}
```

The steps is where it gets interesting, we first checkout the code, and then run the action by using a path reference 
to us `./` while feeding it a `version` with the value `r665`.

```yaml
    steps:
      - uses: actions/checkout@v3
      - name: 'Get Next Release version'
        id: next-release-version
        uses: ./
        with:
          version: r665
```

The action picks that up, does it’s thing, and sets two outputs `version`  and `r_version`. `version` should be `666` 
and `r_version` should be `r666`. To assert that we add two actions call to the assert action, one for each output.

```yaml
      - name: Assert Version Output
        uses: nick-fields/assert-action@v1
        with:
          expected: "666"
          actual: {{ "${{" }} steps.next-release-version.outputs.version }}
      - name: Assert R Version Output
        uses: nick-fields/assert-action@v1
        with:
          expected: "r666"
          actual: {{ "${{" }} steps.next-release-version.outputs.r_version }}
```

Once the PR introducing this was merged in the next PR the new output method replaces the old one and these assertions 
ensure everything works as before. By doing this I’ve been able to update a bunch of actions with no worries about 
accidentally breaking things. The multi line outputs are also a fun one, that I messed up initially. But that is a 
story for another time, for now, this is the simplest way I found to test GitHub actions. Enjoy!