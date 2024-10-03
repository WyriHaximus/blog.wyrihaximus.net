---
layout: post
title: "Building Secure Images with GitHub Actions"
date: 2024-10-01 13:37dw
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
- CVE
- OCI
social:
  image_relative: /images/posts/building-secure-images-with-github-actions_big.jpg
---


When I initially started building Docker images only `amd64` was relevant, and having a build ⇒ Scan ⇒ Test ⇒ Push cycle was as easy as using docker save and docker load. But with `arm64` becoming more and more popular, including with my own home cluster, I needed to add images for `arm64`. For a while this meant I was pushing images with `-amd64` and `-arm64` suffixes before combining them into one “image”. All because I want to ensure no images with CVE’s or bugs are pushed. Skipping those is not acceptable for me as a Software Engineer.

![Photo of an astronaut pained on the back of shipping containers](/images/posts/building-secure-images-with-github-actions.jpg)
> [Photo by Pixabay](https://www.pexels.com/photo/astronaut-graffiti-on-semi-trailers-163811/)

<!-- More -->

The initial problem is that most tooling for building you will find with a quick search will build and push multi arch images in one move. While this is cool if you want to get a multi arch image out there, it does not meet my requirements. So instead I kept building mainly the same way, but now I had another dimension on my CI matrix that is the arch to build for. To be specific `linux/amd64` and `linux/arm64`. (The OS + arch combination is referred to as the image platform.) This will let me test each variant of an image across all supported platforms using QEMU to simulate the arch, short for architecture, they are build for and will run on. At the end of the pipeline where each image is pushed, I had two steps:

- One to push all different image variants
- One to create a manifest combining each platform for each variant and push that

Today, as I’m writing this which is two days ago when you first might be reading this, I finally figured out how to do this without pushing to an external registry first. Not going to bore and confuse you with the changes between my previous iteration, instead I’ll walk you through the, be it a somewhat stripped, workflow that makes this possible.

This set up solves a few issues:

- BuildX is cool, but it doesn’t let you save and load multiplatform images as docker build does
- No images with suffixes on the registry anymore that soil it with images anyone will unlikely use directly
- Only one step to push instead of two

Note: This post is based on this [PR](https://github.com/WyriHaximusNet/docker-redirect/pull/163) on [wyrihaximusnet/docker-redirect](https://github.com/WyriHaximusNet/docker-redirect) if you just want to skip to the workflow. It’s a project I started to learn a ton of languages just a bit, but it got knocked into the background due to the impact the covid pandemic had on me.

### Set up

The workflow needs some basic set up which includes the image name, which registries to push to, a job that does some JSON magic, and a job that will make the supported platforms available. (The jobs could use some polishing preferably into a way that doesn’t require any jobs. But that is an improvement for another time.)

```yaml
name: Continuous Integration
env:
  DOCKER_IMAGE: wyrihaximusnet/redirect
  DOCKER_IMAGE_REGISTRIES_SECRET_MAPPING: '{"ghcr.io":"GHCR_TOKEN","docker.io":"HUB_PASSCODE"}'
on:
  push:
  schedule:
    - cron:  '0 0 * * 0'
jobs:
  registry-matrix:
    name: Extract registries from registry secret mapping
    if: (github.event_name == 'push' || github.event_name == 'schedule') && github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    needs:
      - tests
    outputs:
      registry: {{ "${{" }} steps.registry-matrix.outputs.registry }}
    steps:
      - uses: actions/checkout@v4
      - id: registry-matrix
        name: Extract registries from registry secret mapping
        run: |
          echo "registry=$(printenv DOCKER_IMAGE_REGISTRIES_SECRET_MAPPING | jq -c 'keys')" >> $GITHUB_OUTPUT
  supported-arch-matrix:
    name: Supported processor architectures
    runs-on: ubuntu-latest
    outputs:
      arch: {{ "${{" }} steps.supported-arch-matrix.outputs.arch }}
    steps:
      - uses: actions/checkout@v4
      - id: supported-arch-matrix
        name: Generate Arch
        run: |
          echo "arch=[\"linux/amd64\",\"linux/arm64\"]" >> $GITHUB_OUTPUT
```

### Building

To build the image for multiple platforms we need one thing: QEMU to emulate the arch we’re building for if it’s not the runners native arch. So we have to make sure it’s installed before we can build:

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
```

Once it’s set up we can build the image using the normal docker build command. We pass in the platform using the `--platform` flag and use the environment variable `PLATFORM_PAIR` we created at the start of the job as the suffix on the image tag:

```bash
docker image build --platform={{ "${{" }} matrix.platform }} -t "${DOCKER_IMAGE}:reactphp-{{ "${{" }} env.PLATFORM_PAIR }}" --no-cache .
```

Once the image has been built we use good old `docker save` to save the image to a tarball, for later use we make sure we include the platform in the file name:

```bash
docker save "${DOCKER_IMAGE}:reactphp-{{ "${{" }} env.PLATFORM_PAIR }}" -o ./docker-image/docker_image-{{ "${{" }} env.PLATFORM_PAIR }}.tar
```

Then, we upload the directory the tarball is in as an artifact, and make sure we use the platform in the name, this will come in handy later:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: docker-image-reactphp-{{ "${{" }} env.PLATFORM_PAIR }}
    path: ./docker-image
```

The full job:

```yaml
  build-docker-image:
    name: Build reactphp Docker ({{ "${{" }} matrix.platform }})
    strategy:
      fail-fast: false
      matrix:
        platform: {{ "${{" }} fromJson(needs.supported-arch-matrix.outputs.arch) }}
    needs:
      - supported-arch-matrix
    runs-on: ubuntu-latest
    steps:
      - name: Prepare
        run: |
          platform={{ "${{" }} matrix.platform }}
          echo "PLATFORM_PAIR=${platform//\//-}" >> $GITHUB_ENV
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      - uses: actions/checkout@v4
      - run: mkdir ./docker-image
      - run: docker image build --platform={{ "${{" }} matrix.platform }} --build-arg BUILD_DATE=`date -u +"%Y-%m-%dT%H:%M:%SZ"` --build-arg VCS_REF=`git rev-parse --short HEAD` -t "${DOCKER_IMAGE}:reactphp-{{ "${{" }} env.PLATFORM_PAIR }}" --no-cache .
      - run: docker save "${DOCKER_IMAGE}:reactphp-{{ "${{" }} env.PLATFORM_PAIR }}" -o ./docker-image/docker_image-{{ "${{" }} env.PLATFORM_PAIR }}.tar
      - uses: actions/upload-artifact@v4
        with:
          name: docker-image-reactphp-{{ "${{" }} env.PLATFORM_PAIR }}
          path: ./docker-image
```

### CVE Scanning/Testing

For this post’s sake it  doesn’t matter if I cover testing or scanning, so only the set up is covered and the rest is left for your imagination. (You can always check the PR mentioned earlier in this post of course.)

Depending on what you are going to do, you will need to install QEMU again if you are going to run the image. In the project this is taken from the image will be started and [k6](https://k6.io/) is used to test it functionally.

Next we’ll get the image artifact:

```yaml
- uses: actions/download-artifact@v4
  with:
    name: docker-image-reactphp-{{ "${{" }} env.PLATFORM_PAIR }}
    path: /tmp/docker-image
```

Next we load the image into Docker, this works fine because it’s only built for a single platform and no multi platform manifest is at play:

```bash
docker load --input /tmp/docker-image/docker_image-{{ "${{" }} env.PLATFORM_PAIR }}.tar
```

After that, go wild and do what you have to do to make sure the image is up to spec, in my case I scan for CVE’s to make sure they don’t make it onto the registry:

```bash
echo -e "{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-{{ "${{" }} env.PLATFORM_PAIR }}" | xargs -I % sh -c 'docker run -v /tmp/trivy:/var/lib/trivy -v /var/run/docker.sock:/var/run/docker.sock -t aquasec/trivy:latest --cache-dir /var/lib/trivy image --exit-code 1 --no-progress --format table %'
```

The full job:

```yaml
  go-wild:
    name: Scan reactphp for vulnerabilities ({{ "${{" }} matrix.platform }})
    strategy:
      fail-fast: false
      matrix:
        platform: {{ "${{" }} fromJson(needs.supported-arch-matrix.outputs.arch) }}
    needs:
      - supported-arch-matrix
      - build-docker-image
    runs-on: ubuntu-latest
    steps:
      - name: Prepare
        run: |
          platform={{ "${{" }} matrix.platform }}
          echo "PLATFORM_PAIR=${platform//\//-}" >> $GITHUB_ENV
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: docker-image-reactphp-{{ "${{" }} env.PLATFORM_PAIR }}
          path: /tmp/docker-image
      - run: docker load --input /tmp/docker-image/docker_image-{{ "${{" }} env.PLATFORM_PAIR }}.tar
      - run: rm -Rf /tmp/docker-image/
      - run: # Go wild
```

### Pushing

The reason we don’t need a public registry is because for the pushing we’ll run one locally as a service on the job. We’ll use it in pretty much the same way as the public registry, but this way we don’t clutter it with temporary tags:

```yaml
services:
  registry:
    image: registry:2
    ports:
      - 5000:5000
```

Before we can push we need QEMU again, and Buildx running on the host network:

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  with:
    driver-opts: network=host
```

Next, we download all artifacts for this specific image using the `pattern` option on the `download-artifact` action:

```yaml
- uses: actions/download-artifact@v4
  with:
    pattern: docker-image-reactphp-*
    path: /tmp/docker-image
    merge-multiple: true
```

Once they are all downloaded, and in the same directory we can load them into docker one by one:

```yaml
- run: |
    for f in /tmp/docker-image/docker_image-*.tar; do
      docker load --input $f
    done
```

Before we can use the images to combine them into one, we have to retag and push them to the local registry. Which comes down to prefixing the existing tag with `localhost:5000/`.

```yaml
- run: |
    archs={{ "${{" }} join(fromJson(needs.supported-arch-matrix.outputs.arch), ',') }}
    for arch in ${archs//,/ }
    do
      docker tag "{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}" "localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}"
      docker push "localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}"
    done
```

The easiest way possible to combine multiple images for different platforms into one is by using some Docker `FROM` magic. There are few build in `ARG`s you can use in the `FROM` instruction of a Dockerfile. In this case we use `TARGETOS` and `TARGETARCH` because those match with `linux` and `arm64` in `linux/arm64`.

```bash
echo "FROM localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-\${TARGETOS}-\${TARGETARCH}" >> docker-file-{{ "${{" }} matrix.registry }}-wyrihaximusnet-redirect-reactphp
```

This way we only have to tell Buildx which Dockerfile to use, which platforms to build, what the image tag will be, and to push it when done:

```bash
docker buildx build -f docker-file-{{ "${{" }} matrix.registry }}-wyrihaximusnet-redirect-reactphp --platform={{ "${{" }} join(fromJson(needs.supported-arch-matrix.outputs.arch), ',') }} -t {{ "${{" }} matrix.registry }}/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp . --push
```

The full job:

```yaml
  push-image:
    if: (github.event_name == 'push' || github.event_name == 'schedule') && github.ref == 'refs/heads/master'
    name: Push reactphp to {{ "${{" }} matrix.registry }}
    strategy:
      fail-fast: false
      matrix:
        registry: {{ "${{" }} fromJson(needs.registry-matrix.outputs.registry) }}
    needs:
      - supported-arch-matrix
      - go-wild
      - registry-matrix
    runs-on: ubuntu-latest
    services:
      registry:
        image: registry:2
        ports:
          - 5000:5000
    steps:
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        with:
          driver-opts: network=host
      - uses: actions/download-artifact@v4
        with:
          pattern: docker-image-reactphp-*
          path: /tmp/docker-image
          merge-multiple: true
      - run: |
          for f in /tmp/docker-image/docker_image-*.tar; do
            docker load --input $f
          done
      - run: rm -Rf /tmp/docker-image/
      - run: |
          archs={{ "${{" }} join(fromJson(needs.supported-arch-matrix.outputs.arch), ',') }}
          for arch in ${archs//,/ }
          do
            docker tag "{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}" "localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}"
            docker push "localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-${arch//\//-}"
          done
      - name: Login to {{ "${{" }} matrix.registry }}
        run: |
          echo "{{ "${{" }} env.DOCKER_PASSWORD }}" | \
          docker login {{ "${{" }} matrix.registry }} \
            --username "{{ "${{" }} env.DOCKER_USER }}" \
            --password-stdin
        env:
          DOCKER_USER: {{ "${{" }} secrets.HUB_USERNAME }}
          DOCKER_PASSWORD: {{ "${{" }} secrets[fromJson(env.DOCKER_IMAGE_REGISTRIES_SECRET_MAPPING)[matrix.registry]] }}
      - name: Create merge Dockerfile
        run: echo "FROM localhost:5000/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp-\${TARGETOS}-\${TARGETARCH}" >> docker-file-{{ "${{" }} matrix.registry }}-wyrihaximusnet-redirect-reactphp
      - run: cat docker-file-{{ "${{" }} matrix.registry }}-wyrihaximusnet-redirect-reactphp
      - name: Merged different arch imags into one
        run: docker buildx build -f docker-file-{{ "${{" }} matrix.registry }}-wyrihaximusnet-redirect-reactphp --platform={{ "${{" }} join(fromJson(needs.supported-arch-matrix.outputs.arch), ',') }} -t {{ "${{" }} matrix.registry }}/{{ "${{" }} env.DOCKER_IMAGE }}:reactphp . --push
```

### Conclusion

This has been something I’ve been wanting to do for a few years, ever since I started building multi platform images. Will polish it before putting it with the rest of my centralized [GitHub Action Workflows](https://github.com/WyriHaximus/github-workflows/). But for now, I’m happy 😎.
