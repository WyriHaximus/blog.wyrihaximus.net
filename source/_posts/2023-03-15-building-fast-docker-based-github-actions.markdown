---
layout: post
title: "Building fast Docker based GitHub Actions"
date: 2023-03-15 13:37dw
comments: true
categories:
- GitHub Actions
- Docker
- PHP
tags:
- GitHub Actions
- Docker
- PHP
social:
  image_relative: /images/posts/pexels-james-wheeler-1598075.jpg
---

One of my pet peeves when using GitHub Actions are Docker based Actions that build on every single run. It’s such a wasteful and error prone way to create an action. Not only does it take longer to set up the action when you run it due to whatever command is ran in there, also any issue on the network will make it fail and requires human intervention to start it up again. In this post I’ll go over my set up of using tagged images hosted on Docker Hub/GitHub Container Registry, and how to make the `username/action@v1` way of versioning Actions work with that.

![Containers moving fast along the railroad](/images/posts/pexels-james-wheeler-1598075.jpg)
> [Photo by James Wheeler from Pexels](https://www.pexels.com/photo/passing-train-on-the-tracks-1598075/)

<!-- More -->

## Why

Building a Docker can be a time consuming process. Some of my actions pull in a bunch of dependencies and those take . And back in the day (2020?) when I started converting to this way of building GitHub Actions the first action I would do took somewhere between 30 to 60 seconds to build. Which is a lot when you realize GitHub bills you by the minute when running Actions in private repositories. After switching it took 5 to 10 seconds max. Huge difference and it also fits the Docker “build once, run everywhere” mantra very well.

## What

This method of working consists of a few parts:

- A publicly pullable OCI (Docker) image on a registry - Going with the GitHub Container Registry because it’s the easiest to set up
- Dockerfile - The Dockerfile the Action uses to run
- Dockerfile-build - The Dockerfile we use to build for the Action’s Dockerfile can use it
- A workflow to do all the heavy lifting

## Building

The `Dockerfile` is the smallest part of our set up but very central to it all:

```docker
FROM ghcr.io/USERNAME/REPOSITORY:DEFAULTBRANCH
```

For example:

```docker
FROM ghcr.io/wyrihaximus/github-action-wait-for-status:master
```

The `Dockerfile-build` does whatever it needs to do to become ready to run as an Action:

```docker
# syntax=docker/dockerfile:experimental
FROM wyrihaximusnet/php:8.2-nts-alpine-dev-root AS install-dependencies
RUN mkdir /workdir
COPY ./composer.* /workdir/
WORKDIR /workdir
RUN composer install --ansi --no-progress --no-interaction --prefer-dist

## Compile runtime image
FROM wyrihaximusnet/php:8.2-nts-alpine-root AS runtime
RUN mkdir /workdir
WORKDIR /workdir
COPY ./src /workdir/src
COPY ./composer.* ./wait.php /workdir/
COPY --from=install-dependencies /workdir/vendor/ /workdir/vendor/
RUN ls -lasth ./
ENTRYPOINT ["php", "/workdir/wait.php"]
```

Before we get building, we’ll set up QEMU and BuildX to build multi platform images that can run on x64 (amd64) CPU’s and ARM (arm (32bit CPU’s like Raspberry Pi 3’s (and lower)) and arm64 (64bit ARM CPU’s like Apple’s M1 or Raspberry Pi 4’s).

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v1
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v1
  with:
    install: true
```

Because we are using BuildX we login to the GitHub Container Registry before we start building as we push it there right away. As you might notice I’ve hardcoded my username in there, should pick that up from the environment to make it more portable but haven’t gotten around that yet. And since the username has to match the actor (to make the secret work) and that is always me on my GitHub Actions. (But should fix that 😅.)

```yaml
- name: Login to GHPR
  run: |
    echo "{{ "${{" }} secrets.GITHUB_TOKEN }}" | \
    docker login ghcr.io \
      --username "WyriHaximus" \
      --password-stdin
```

The following `docker build` creates a multi platform images for amd64, arm, and arm64, pushes it to GHCR directly and uses a `sha-COMMITSHA` tag. This command is also where is shows how nice and useful the environment variables are. I can compose the entire image tag without having to know the image name because it will match the repository (after making sure it’s all lowercase characters).

```yaml
- run: docker build --platform=linux/arm/v7,linux/arm64,linux/amd64 --output=type=registry --no-cache -t $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]') . -f Dockerfile-build
```

Once the images has been build we pull one of them in and run trivy over it to make sure we don’t ship any known CVE in the image. This is something I (intend to) do with all my images to ensure they always have recent security issues patched.

```yaml
- run: docker pull $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]')
- run: docker run -v /tmp/trivy:/var/lib/trivy -v /var/run/docker.sock:/var/run/docker.sock -t aquasec/trivy:latest --cache-dir /var/lib/trivy image --exit-code 1 --no-progress --format table $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]')
```

With the image now build and tested for CVE’s we can now start testing the image functionally. Make sure it functions as intended. Because we tagged and pushed the image we can pull it right in with an update to the `Dockerfile` we use `uses: ./` to test our action directly.

```yaml
- run: sed -i "s/master/sha-${GITHUB_SHA}/g" Dockerfile
- name: 'Test action'
  uses: ./

```

## Releasing

The way I’m releasing is by closing a milestone that triggers a workflow doing the retagging and releasing. But before we need to figure out which version to image tags to create and which git tags to create. Git tags only have to be created once as we rely on mutable OCI images for getting the latest version.

```yaml
- uses: WyriHaximus/github-action-break-up-semver@master
  id: breakupsemver
  with:
    version: {{ "${{" }} env.MILESTONE }}
- id: generate-version-strategy
  name: Generate Versions
  env:
    MAJOR: {{ "${{" }} steps.breakupsemver.outputs.v_major }}
    MAJOR_MINOR: {{ "${{" }} steps.breakupsemver.outputs.v_major_minor }}
    MAJOR_MINOR_PATCH: {{ "${{" }} steps.breakupsemver.outputs.v_major_minor_patch }}
  run: |
    echo "::set-output name=docker_versions::[\"${MAJOR}\",\"${MAJOR_MINOR}\",\"${MAJOR_MINOR_PATCH}\"]"
    git tag > tag.list
    cat tag.list
    printf "::set-output name=tag_versions::%s" $(jq --raw-input --slurp 'split("\n")' tag.list -c | php -r "echo json_encode(array_values(array_diff_assoc(json_decode('[\"${MAJOR}\",\"${MAJOR_MINOR}\",\"${MAJOR_MINOR_PATCH}\"]'), json_decode(stream_get_contents(STDIN)))));")
```

Once we have that list we put it in a matrix and tag each OCI image by creating a temporary `Docker.tag` file with nothing more than a `FROM dockerimage:sha-COMMITSHA` to do the multiplatform retag.

```yaml
tag-docker-image:
    name: Tag Docker image for version {{ "${{" }} matrix.version }}
    needs:
      - generate-version-strategy
    strategy:
      fail-fast: false
      matrix:
        version: {{ "${{" }} fromJson(needs.generate-version-strategy.outputs.docker_versions) }}
    runs-on: ubuntu-latest
    steps:
      - name: Retag
        run: |
          printf "FROM %s" $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]') >> Dockerfile.tag
          docker build --platform=linux/arm/v7,linux/arm64,linux/amd64 --output=type=registry --no-cache -f Dockerfile.tag -t $(echo "ghcr.io/${GITHUB_REPOSITORY}:{{ "${{" }} matrix.version }}" | tr '[:upper:]' '[:lower:]') .
```

For the Git tags we do something similar, but a lot harder to slim down for the examples so here is the full thing. It does a few things, it takes the previously generated changelog (you can find the full examples for both workflows at the bottom of this post), create a branch update the `Dockerfile` to point at the tagged image version, create a commit, create a tag, and then create a release. Now the `vx.y.z` tag will have the full changelog, but the `vx.y` and `vx` tags will have a message mentioning that those are just reference tags to the `vx.y.z` tag.

```yaml
create-release:
    name: Create Release
    needs:
      - generate-version-strategy
      - generate-changelog
    strategy:
      fail-fast: false
      matrix:
        version: {{ "${{" }} fromJson(needs.generate-version-strategy.outputs.tag_versions) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Create release/{{ "${{" }} matrix.version }} branch
        run: git checkout -b release/{{ "${{" }} matrix.version }} ${GITHUB_SHA}
      - run: sed -i 's/master/{{ "${{" }} matrix.version }}/g' Dockerfile
      - run: git add Dockerfile
      - run: git status
      - run: echo -e "${CHANGELOG}" > release-{{ "${{" }} matrix.version }}-changelog.md
        env:
          CHANGELOG: {{ "${{" }} needs.generate-changelog.outputs.changelog }}
      - run: |
          echo -e "${MILESTONE_DESCRIPTION}\r\n\r\n${CHANGELOG}" > release-{{ "${{" }} matrix.version }}-release-message.md
          cat release-{{ "${{" }} matrix.version }}-release-message.md
          release_message=$(cat release-{{ "${{" }} matrix.version }}-release-message.md)
          release_message="${release_message//'%'/'%25'}"
          release_message="${release_message//$'\n'/'%0A'}"
          release_message="${release_message//$'\r'/'%0D'}"
          echo "::set-output name=release_message::$release_message"
        id: releasemessage
        env:
          MILESTONE_DESCRIPTION: {{ "${{" }} github.event.milestone.description }}
          CHANGELOG: {{ "${{" }} needs.generate-changelog.outputs.changelog }}
      - run: cat release-{{ "${{" }} matrix.version }}-changelog.md
      - name: Set git commit user
        run: |
          git config user.name '{{ "${{" }} github.actor }}'
          git config user.email '{{ "${{" }} github.actor }}@users.noreply.github.com'
      - run: git commit -F release-{{ "${{" }} matrix.version }}-changelog.md
      - run: git tag -F release-{{ "${{" }} matrix.version }}-changelog.md {{ "${{" }} matrix.version }}
      - name: Push changes
        uses: ad-m/github-push-action@v0.6.0
        with:
          tags: true
          branch: release/{{ "${{" }} matrix.version }}
          github_token: {{ "${{" }} secrets.GITHUB_TOKEN }}
      - name: Create Reference Release with Changelog
        if: {{ "${{" }} matrix.version == env.MILESTONE }}
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: {{ "${{" }} secrets.GITHUB_TOKEN }}
        with:
          tag_name: {{ "${{" }} matrix.version }}
          release_name: {{ "${{" }} matrix.version }}
          body: {{ "${{" }} steps.releasemessage.outputs.release_message }}
          draft: false
          prerelease: false
          commitish: release/{{ "${{" }} matrix.version }}
      - name: Create Release with Changelog
        if: {{ "${{" }} matrix.version != env.MILESTONE }}
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: {{ "${{" }} secrets.GITHUB_TOKEN }}
        with:
          tag_name: {{ "${{" }} matrix.version }}
          release_name: {{ "${{" }} matrix.version }}
          body: |
            Reference tag to {{ "${{" }} env.MILESTONE }}
            Note: this tag will not be updated when new v1.x.x releases are tagged. Instead, it relies on providing the latest v1.x.x releases through mutable Docker image tags. Please see Docker Hub and compare the latest 3 versions and their hashes.
          draft: false
          prerelease: false
          commitish: release/{{ "${{" }} matrix.version }}
			- name: Delete release/{{ "${{" }} matrix.version }} branch
        uses: dawidd6/action-delete-branch@v3
        with:
          github_token: {{ "${{" }}github.token}}
          branches: release/{{ "${{" }} matrix.version }}
```

## Conclusion

This is how I’m ensuring my Docker based Actions work just as anyone would expect from a GitHub Action using the advertised way of versioning, plug keeping set up performance snappy and support the most used CPU platforms. It served my very well these past few years and the only issue I’ve ran into is some confusion about why it works for those not very fluent in Docker.

## Appendixes

### ci.yaml

```yaml
name: Continuous Integration
env:
  DOCKER_IMAGE: wyrihaximusgithubactions/wait-for-status
  DOCKER_BUILDKIT: 1
on:
  push:
    branches:
      - master
  pull_request:
jobs:
  test-docker-image:
    runs-on: ubuntu-latest
    needs: build-docker-image
    steps:
      - uses: actions/checkout@v1
      - run: sed -i "s/master/sha-${GITHUB_SHA}/g" Dockerfile
      - name: 'Wait for status checks'
        id: waitforstatuschecks
        uses: ./
        with:
          ignoreActions: "test-docker-image,Create Release,Wait for status checks"
          checkInterval: 1
        env:
          GITHUB_TOKEN: "{{ "${{" }} secrets.GITHUB_TOKEN }}"
      - run: |
          echo "{{ "${{" }} steps.waitforstatuschecks.outputs.status }}"
          exit 78
        if: steps.waitforstatuschecks.outputs.status != 'success'
  composer-install:
    runs-on: ubuntu-latest
    container:
      image: wyrihaximusnet/php:7.4-zts-alpine3.12-dev-root
    steps:
      - uses: actions/checkout@v1
      - name: Cache composer packages
        uses: actions/cache@v1
        with:
          path: ./vendor/
          key: {{ "${{" }} hashFiles('**/composer.json') }}-{{ "${{" }} hashFiles('**/composer.lock') }}
      - name: Install Dependencies
        run: composer install --ansi --no-progress --no-interaction --prefer-dist -o
  qa:
    strategy:
      fail-fast: false
      matrix:
        qa: [lint, cs, stan, psalm, unit, infection, composer-require-checker, composer-unused]
    needs: composer-install
    runs-on: ubuntu-latest
    container:
      image: wyrihaximusnet/php:7.4-zts-alpine3.12-dev-root
    steps:
      - uses: actions/checkout@v1
      - name: Cache composer packages
        uses: actions/cache@v1
        with:
          path: ./vendor/
          key: {{ "${{" }} hashFiles('**/composer.json') }}-{{ "${{" }} hashFiles('**/composer.lock') }}
      - name: Install Dependencies
        run: (test -f vendor && true ) || composer install --ansi --no-progress --no-interaction --prefer-dist -o
      - run: sleep 60
        if: matrix.qa == 'infection'
      - run: make {{ "${{" }} matrix.qa }}
        env:
          GITHUB_TOKEN: "{{ "${{" }} secrets.GITHUB_TOKEN }}"
  generate-ref:
    name: Generate Ref
    runs-on: ubuntu-latest
    outputs:
      REF: {{ "${{" }} steps.generate-ref.outputs.ref }}
    steps:
      - uses: actions/checkout@v1
      - id: generate-ref
        name: Generate Ref
        run: |
          if [ "{{ "${{" }} github.event_name }}" == "pull_request" ] ; then
            ref=$(php -r "echo str_replace('/', '-SLASH-', '{{ "${{" }} github.event.pull_request.head.ref }}');")
            echo "$ref"
            printf "::set-output name=ref::%s" $ref
            exit 0
          fi
          echo "${GITHUB_REF##*/}"
          echo "::set-output name=ref::${GITHUB_REF##*/}"
  lint-dockerfile:
    name: Lint Dockerfile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Lint Dockerfile
        uses: docker://hadolint/hadolint:latest-debian
        with:
          entrypoint: hadolint
          args: Dockerfile-build
  build-docker-image:
    strategy:
      fail-fast: false
    name: Build Docker image
    needs:
      - generate-ref
      - lint-dockerfile
      - qa
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v1
      - name: Set up Docker Buildx
        id: buildx
        uses: docker/setup-buildx-action@v1
        with:
          install: true
      - name: Inspect builder
        run: |
          echo "Name:      {{ "${{" }} steps.buildx.outputs.name }}"
          echo "Endpoint:  {{ "${{" }} steps.buildx.outputs.endpoint }}"
          echo "Status:    {{ "${{" }} steps.buildx.outputs.status }}"
          echo "Flags:     {{ "${{" }} steps.buildx.outputs.flags }}"
          echo "Platforms: {{ "${{" }} steps.buildx.outputs.platforms }}"
      - run: echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]'
      - name: Login to GPR
        if: contains(github.ref, 'dependabot') == false
        run: |
          echo "{{ "${{" }} secrets.GITHUB_TOKEN }}" | \
          docker login ghcr.io \
            --username "WyriHaximus" \
            --password-stdin
      - run: docker build --platform=linux/arm/v7,linux/arm64,linux/amd64 --output=type=registry --no-cache -t $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]') . -f Dockerfile-build
      - run: docker pull $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]')
      - run: docker run -v /tmp/trivy:/var/lib/trivy -v /var/run/docker.sock:/var/run/docker.sock -t aquasec/trivy:latest --cache-dir /var/lib/trivy image --exit-code 1 --no-progress --format table $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]')
      - run: |
          printf "FROM %s" $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]') >> Dockerfile.tag
          docker build --platform=linux/arm/v7,linux/arm64,linux/amd64 --output=type=registry --no-cache -f Dockerfile.tag -t $(echo "ghcr.io/${GITHUB_REPOSITORY}:{{ "${{" }} needs.generate-ref.outputs.ref }}" | tr '[:upper:]' '[:lower:]') .
```

### craft-release.yaml

```yaml
name: Create Release
env:
  DOCKER_IMAGE: wyrihaximusgithubactions/wait-for-status
  MILESTONE: {{ "${{" }} github.event.milestone.title }}
on:
  milestone:
    types:
      - closed
jobs:
  wait-for-status-checks:
    name: Wait for status checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - run: sleep 13
      - name: 'Wait for status checks'
        id: waitforstatuschecks
        uses: WyriHaximus/github-action-wait-for-status@v1
        with:
          ignoreActions: "Wait for status checks,Create Release"
          checkInterval: 5
        env:
          GITHUB_TOKEN: "{{ "${{" }} secrets.GITHUB_TOKEN }}"
      - id: generate-version-strategy
        if: steps.waitforstatuschecks.outputs.status != 'success'
        name: Fail
        run: exit 1
  generate-version-strategy:
    name: Generate Version Strategy
    needs:
      - wait-for-status-checks
    runs-on: ubuntu-latest
    outputs:
      docker_versions: {{ "${{" }} steps.generate-version-strategy.outputs.docker_versions }}
      tag_versions: {{ "${{" }} steps.generate-version-strategy.outputs.tag_versions }}
    steps:
      - uses: actions/checkout@v1
      - uses: WyriHaximus/github-action-break-up-semver@master
        id: breakupsemver
        with:
          version: {{ "${{" }} env.MILESTONE }}
      - id: generate-version-strategy
        name: Generate Versions
        env:
          MAJOR: {{ "${{" }} steps.breakupsemver.outputs.v_major }}
          MAJOR_MINOR: {{ "${{" }} steps.breakupsemver.outputs.v_major_minor }}
          MAJOR_MINOR_PATCH: {{ "${{" }} steps.breakupsemver.outputs.v_major_minor_patch }}
        run: |
          echo "::set-output name=docker_versions::[\"${MAJOR}\",\"${MAJOR_MINOR}\",\"${MAJOR_MINOR_PATCH}\"]"
          git tag > tag.list
          cat tag.list
          printf "::set-output name=tag_versions::%s" $(jq --raw-input --slurp 'split("\n")' tag.list -c | php -r "echo json_encode(array_values(array_diff_assoc(json_decode('[\"${MAJOR}\",\"${MAJOR_MINOR}\",\"${MAJOR_MINOR_PATCH}\"]'), json_decode(stream_get_contents(STDIN)))));")
  generate-changelog:
    name: Generate Changelog
    needs:
      - generate-version-strategy
    runs-on: ubuntu-latest
    outputs:
      changelog: {{ "${{" }} steps.changelog.outputs.changelog }}
    steps:
      - name: Generate changelog
        uses: WyriHaximus/github-action-jwage-changelog-generator@v1
        id: changelog
        env:
          GITHUB_TOKEN: {{ "${{" }} secrets.GITHUB_TOKEN }}
        with:
          milestone: {{ "${{" }} env.MILESTONE }}
      - name: Show changelog
        run: echo "${CHANGELOG}"
        env:
          CHANGELOG: {{ "${{" }} steps.changelog.outputs.changelog }}
  tag-docker-image:
    name: Tag Docker image for version {{ "${{" }} matrix.version }}
    needs:
      - generate-version-strategy
    strategy:
      fail-fast: false
      matrix:
        version: {{ "${{" }} fromJson(needs.generate-version-strategy.outputs.docker_versions) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v1
      - name: Set up Docker Buildx
        id: buildx
        uses: docker/setup-buildx-action@v1
        with:
          install: true
      - name: Inspect builder
        run: |
          echo "Name:      {{ "${{" }} steps.buildx.outputs.name }}"
          echo "Endpoint:  {{ "${{" }} steps.buildx.outputs.endpoint }}"
          echo "Status:    {{ "${{" }} steps.buildx.outputs.status }}"
          echo "Flags:     {{ "${{" }} steps.buildx.outputs.flags }}"
          echo "Platforms: {{ "${{" }} steps.buildx.outputs.platforms }}"
      - run: echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]'
      - name: Login to GPR
        run: |
          echo "{{ "${{" }} secrets.GITHUB_TOKEN }}" | \
          docker login ghcr.io \
            --username "WyriHaximus" \
            --password-stdin
          printf "FROM %s" $(echo "ghcr.io/${GITHUB_REPOSITORY}:sha-${GITHUB_SHA}" | tr '[:upper:]' '[:lower:]') >> Dockerfile.tag
          docker build --platform=linux/arm/v7,linux/arm64,linux/amd64 --output=type=registry --no-cache -f Dockerfile.tag -t $(echo "ghcr.io/${GITHUB_REPOSITORY}:{{ "${{" }} matrix.version }}" | tr '[:upper:]' '[:lower:]') .
  create-release:
    name: Create Release
    needs:
      - generate-version-strategy
      - tag-docker-image
      - generate-changelog
    strategy:
      fail-fast: false
      matrix:
        version: {{ "${{" }} fromJson(needs.generate-version-strategy.outputs.tag_versions) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - name: Create release/{{ "${{" }} matrix.version }} branch
        run: git checkout -b release/{{ "${{" }} matrix.version }} ${GITHUB_SHA}
      - run: sed -i 's/master/{{ "${{" }} matrix.version }}/g' Dockerfile
      - run: cat Dockerfile
      - run: git add Dockerfile
      - run: git status
      - run: echo -e "${CHANGELOG}" > release-{{ "${{" }} matrix.version }}-changelog.md
        env:
          CHANGELOG: {{ "${{" }} needs.generate-changelog.outputs.changelog }}
      - run: |
          echo -e "${MILESTONE_DESCRIPTION}\r\n\r\n${CHANGELOG}" > release-{{ "${{" }} matrix.version }}-release-message.md
          cat release-{{ "${{" }} matrix.version }}-release-message.md
          release_message=$(cat release-{{ "${{" }} matrix.version }}-release-message.md)
          release_message="${release_message//'%'/'%25'}"
          release_message="${release_message//$'\n'/'%0A'}"
          release_message="${release_message//$'\r'/'%0D'}"
          echo "::set-output name=release_message::$release_message"
        id: releasemessage
        env:
          MILESTONE_DESCRIPTION: {{ "${{" }} github.event.milestone.description }}
          CHANGELOG: {{ "${{" }} needs.generate-changelog.outputs.changelog }}
      - run: cat release-{{ "${{" }} matrix.version }}-changelog.md
      - name: Set git commit user
        run: |
          git config user.name '{{ "${{" }} github.actor }}'
          git config user.email '{{ "${{" }} github.actor }}@users.noreply.github.com'
      - run: git commit -F release-{{ "${{" }} matrix.version }}-changelog.md
      - run: git tag -F release-{{ "${{" }} matrix.version }}-changelog.md {{ "${{" }} matrix.version }}
      - name: Push changes
        uses: ad-m/github-push-action@v0.6.0
        with:
          tags: true
          branch: release/{{ "${{" }} matrix.version }}
          github_token: {{ "${{" }} secrets.GITHUB_TOKEN }}
      - name: Create Reference Release with Changelog
        if: {{ "${{" }} matrix.version == env.MILESTONE }}
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: {{ "${{" }} secrets.GITHUB_TOKEN }}
        with:
          tag_name: {{ "${{" }} matrix.version }}
          release_name: {{ "${{" }} matrix.version }}
          body: {{ "${{" }} steps.releasemessage.outputs.release_message }}
          draft: false
          prerelease: false
          commitish: release/{{ "${{" }} matrix.version }}
      - name: Create Release with Changelog
        if: {{ "${{" }} matrix.version != env.MILESTONE }}
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: {{ "${{" }} secrets.GITHUB_TOKEN }}
        with:
          tag_name: {{ "${{" }} matrix.version }}
          release_name: {{ "${{" }} matrix.version }}
          body: |
            Reference tag to {{ "${{" }} env.MILESTONE }}

            Note: this tag will not be updated when new v1.x.x releases are tagged. Instead, it relies on providing the latest v1.x.x releases through mutable Docker image tags. Please see Docker Hub and compare the latest 3 versions and their hashes.
          draft: false
          prerelease: false
          commitish: release/{{ "${{" }} matrix.version }}
      - name: Delete release/{{ "${{" }} matrix.version }} branch
        uses: dawidd6/action-delete-branch@v3
        with:
          github_token: {{ "${{" }}github.token}}
          branches: release/{{ "${{" }} matrix.version }}
```
