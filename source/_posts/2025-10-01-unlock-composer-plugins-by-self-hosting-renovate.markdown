---
layout: post
title: "Unlock Composer Plugins by Self Hosting Renovate"
date: 2025-10-01 13:37dw
comments: true
categories:
  - PHP
  - Composer
  - Renovate
tags:
- PHP
- Composer
- Renovate
social:
  image_relative: /images/posts/pexels-lishadunlap-11447064.jpg
---

It’s been a while since I started replacing Dependabot with Renovate because of the crazy amount of configuration 
options. One of the options that stood out to me is the `allowPlugins` option, which, understandably, is only when 
self hosting Renovate. But at that point I just got started with it and wanted to make sure it can do all the other 
things, until now!

![Electronic Parts and Wires on Breadboards](/images/posts/pexels-lishadunlap-11447064.jpg)
> [Photo by Lisha Dunlap from Pexels](https://www.pexels.com/photo/electronic-parts-and-wires-11447064/)

<!-- More -->

## Background

The main reason I’m looking into this now, and making it happen is because my Makefile’s package for my PHP packages 
generates a `Makefile` for the package on `composer` update/install. This is cool and all, but becomes a royal pain 
in the ass when you have to go into every PR by Renovate (or Dependabot for that matter) and run `composer install` (
well `make install` since the make files come with that) to update the `Makefile` , commit it, push it, and wait for 
another round of CI to run. The amount of packages I’ve put this Makefile’s package in isn’t that high, but the 
expected pain became visible very quickly.

## Desired Working

The plan was to utilize my centralize workflows to run Renovate on each repository using the `GITHUB_TOKEN` so it all 
stayed self-contained on a single repository and I only had to roll that out. This would also easily let me hook it 
into the rebase checkbox Renovate has. Not an option due to not enough permissions on the token.

After some additional reading and checking with a friend, I went with a GitHub App. This because it has more 
permissions than the token and I don’t want to use a `PAT` for this. This also didn’t work because I was testing this 
out on an org while the GitHub Actions Workflow was in a repository on my personal use. As such secrets aren’t passed 
into the called workflow due to security reasons. (Even if you explicitly tell it to inheret secrets.) That however 
did laid out the basis and after quickly moving the workflow that runs Renovate into that org it all worked.

## Actual Workings

At this point I set up a private repository on my personal user, uninstall Mend’s hosted Renovate, and set up a GitHub 
App.  Then I started with this Workflow that, while having access to all my public and private repositories, will only 
run on `renovate-private-runner` which is where Renovate runs, and `random-PHP-project`.

```yaml
name: Renovate

on:
  schedule:
    - cron: "0 6-22/2 * * 1-5"
    - cron: "0 12-23/2 * * 0,6"
  push:
    branches:
      - 'main'
  issues:
    types:
      - edited
  workflow_call:
    inputs:
      runsOn:
        description: Define on which runner this workflow should run
        default: "ubuntu-latest"
        required: false
        type: string

concurrency:
  group: 'renovate'
  cancel-in-progress: false

jobs:
  renovate:
    name: Renovate
    runs-on: {{ "${{" }}  inputs.runsOn || 'ubuntu-latest' }}
    steps:
      - name: Generate Token
        uses: actions/create-github-app-token@a8d616148505b5069dccd32f177bb87d7f39123b # v2.1.1
        id: app-token
        with:
          app-id: {{ "${{" }}  secrets.RENOVATE_BOT_CLIENT_ID }}
          private-key: {{ "${{" }}  secrets.RENOVATE_BOT_PRIVATE_KEY }}
          owner: {{ "${{" }}  github.repository_owner }}
      - name: Self-hosted Renovate
        uses: renovatebot/github-action@7876d7a812254599d262d62b6b2c2706018258a2 # v43.0.10
        with:
          token: {{ "${{" }}  steps.app-token.outputs.token }}
          mount-docker-socket: true
        env:
          RENOVATE_AUTODISCOVER: true
          RENOVATE_BINARY_SOURCE: docker
          RENOVATE_INTERNAL_CHECKS_FILTER: strict
          RENOVATE_PLATFORM: github
          RENOVATE_PLATFORM_COMMIT: true
          RENOVATE_ONBOARDING: false
          LOG_LEVEL: info

```

Couple of key points:

- Run every other hour in time slots I can be awake
- Run on pushes to run the latest version right away
- Run on issue edits, need to filter this down to the Dependency Dashboard, but for now this works
- Run only one at a time
- Make sure Docker is used and reachable

Since it’s a GitHub App and Renovate expects a token we run the GitHub App Id and Key 
through [`actions/create-github-app-token`](https://github.com/actions/create-github-app-token) to get a token for 
Renovate to use. Added bonus of it being a GitHub App, no need to checkout the code in the repo the app runs in.

#### Options that made the initial cut

##### RENOVATE_AUTODISCOVER

Because we want Renovate to pick up any new repositories we turn on auto discovery and set the app to have access to all repositories the token we get from the previous step has access to.
##### RENOVATE_BINARY_SOURCE

Setting this to `docker` so we don’t have to manage this part of Renovate.

All the above will give you your regular Renovate experience, it does all the good stuff but not the magic yet.

## Making the Magic happen!

To make the magic happen we first need to make sure Renovate will run composer with plugins and scripts enabled. So we 
set `RENOVATE_ALLOW_PLUGINS` and `RENOVATE_ALLOW_SCRIPTS` to `true`. Plus make sure `RENOVATE_IGNORE_PLUGINS` 
and `RENOVATE_IGNORE_SCRIPTS` are set to `false`, even tho one of them defaults to `false`. By setting those four 
environment variables we get renovate to drop the `—no-plugins`, `—no-scripts`, and `—no-autoloader` lets. For those 
interested that is done [here](https://github.com/renovatebot/renovate/blob/8ecf20b18225012eb69c62b42738d847c5837232/lib/modules/manager/composer/utils.ts#L41-L47). And 
thus running all allowed plugins and any scipts defined in `composer.json` on updating dependencies.

Since we run all of this in Docker we set `RENOVATE_DOCKER_CLI_OPTIONS` to `-t -e=COMPOSER_IGNORE_PLATFORM_REQS=1` 
mainly because `RENOVATE_COMPOSER_IGNORE_PLATFORM_REQS` set to `["*"]` doesn’t work as expected. Plus we want to make 
sure we run Docker with `TTY` as I'm using some `Makefile` magic that relies on having a `TTY`.

At this point we have everything that will update the files of our project. But we’re missing a way to include it in 
the commit Renovate creates for updates. The good thing is, and the whole reason we run self hosted, we can 
do `git add`. (Note that `git add .` or `git add . -A` don't capture all changes where `git add` does.) So we add two 
new environment variables. First `RENOVATE_ALLOWED_COMMANDS` with `["git add"]` to allow running `git add` 
after `composer` done its thing. Then we tell Renovate via `RENOVATE_POST_UPGRADE_TASKS` to run git add after composer 
is done, and allow all files with the following 
configuration: `{"commands": ["git add"], "fileFilters": ["**/*"], "executionMode": "update"}`.

## Maybe Future Workings?

The stretch goal with all of this is to have the full Renovate experience. Which means triggering on those checkbox 
clicks. With that I can trigger it only for that repo instead of running every X hours for all of them. That means I 
can do one full run a day, somewhere during the night, and when I work on a repo clicking those checkboxes will trigger 
it for that repo only. But that is something for the future.

## Conclusion

Getting this to work has been 80% of the effect, tweaking it till it runs flawless perfectly like I want to the other 
80%. Getting the extras described above, probably the last 80%. But for new, the following does everything I want:

```yaml
name: Renovate

on:
  schedule:
    - cron: "0 6-22/2 * * 1-5"
    - cron: "0 12-23/2 * * 0,6"
  push:
    branches:
      - 'main'
  issues:
    types:
      - edited
  workflow_call:
    inputs:
      runsOn:
        description: Define on which runner this workflow should run
        default: "queue"
        required: false
        type: string

concurrency:
  group: 'renovate'
  cancel-in-progress: false

jobs:
  renovate:
    name: Renovate
    runs-on: {{ "${{" }}  inputs.runsOn || 'ubuntu-latest' }}
    steps:
      - name: Generate Token
        uses: actions/create-github-app-token@a8d616148505b5069dccd32f177bb87d7f39123b # v2.1.1
        id: app-token
        with:
          app-id: {{ "${{" }}  secrets.RENOVATE_BOT_CLIENT_ID }}
          private-key: {{ "${{" }}  secrets.RENOVATE_BOT_PRIVATE_KEY }}
          owner: {{ "${{" }}  github.repository_owner }}
          repositories: {{ "${{" }}  secrets.RENOVATE_REPOSITORIES }}
      - name: Self-hosted Renovate
        uses: renovatebot/github-action@7876d7a812254599d262d62b6b2c2706018258a2 # v43.0.10
        with:
          token: {{ "${{" }}  steps.app-token.outputs.token }}
          mount-docker-socket: true
        env:
          RENOVATE_ALLOW_PLUGINS: true
          RENOVATE_ALLOW_SCRIPTS: true
          RENOVATE_ALLOWED_COMMANDS: "[\"git add\"]"
          RENOVATE_AUTODISCOVER: true
          RENOVATE_BINARY_SOURCE: docker
          RENOVATE_POST_UPGRADE_TASKS: "{\"commands\": [\"git add\"], \"fileFilters\": [\"**/*\"], \"executionMode\": \"update\"}"
          RENOVATE_DOCKER_CLI_OPTIONS: "-t -e=COMPOSER_IGNORE_PLATFORM_REQS=1"
          RENOVATE_HOST_RULES: {{ "${{" }}  secrets.RENOVATE_HOST_RULES }} # [{"matchHost": "docker.io","username": "<some-user>","password": "<some-token>"}]
          RENOVATE_IGNORE_PLUGINS: false
          RENOVATE_IGNORE_SCRIPTS: false
          LOG_LEVEL: info
#          LOG_LEVEL: debug
#          LOG_FORMAT: json
```