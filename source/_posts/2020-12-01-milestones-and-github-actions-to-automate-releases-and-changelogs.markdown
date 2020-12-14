---
layout: post
title: "Milestones and GitHub Actions to automate releases and changelogs"
date: 2020-12-01 13:37dw
comments: true
categories:
- PHP
- GitHub Actions
tags:
- PHP
- GitHub Actions
- Milestones
- Releases
- Changelogs
social:
  image_relative: /images/posts/keyboard.jpg
---

INTRO

![Keyboard](/images/posts/keyboard.jpg)

<!-- More -->

## Milestones

Milestones are at the core of the way of working with releases I'm describing in this article. Hence, one of the first 
things we'll do is adding a milestone to each PR. And, for maximum effect configure your branch protection to disallow 
pushes direct to your default branch. Another tool that greatly helps is the 
[`PR Milestone Check`](https://github.com/marketplace/pr-milestone-check) app on the GitHub Marketplace. That way you 
must set a milestone on your PR's and thus force you to organize them.

## Using the milestone for update instructions

One of the nice things about milestones is that they can have descriptions, and those descriptions can be used to add 
additional text to releases containing news, deprecations, BC breaks, or other changes. For example adding PHP 8 
support to packages can look like this:

![PHP 8 support milestone description example](/images/posts/php-8-support-milestone-description-example.png)

Achieve this by adding the following markdown to the milestone description:

```markdown
The release adds PHP 8 support!

![PHP 8 Logo](https://blog.wyrihaximus.net/images/php8-logo.png "PHP 8 Logo")
```

Be aware that GitHub doesn't render markdown in milestone descriptions well in their UI. (Raised this issue when them a while ago.)

## Adding Milestones to PR's/issues

The following workflow will get the latest tagged version, get the next minor release version, and add it to the PR, 
creating the milestone when it doesn't exist yet. This is a fairly straight forward workflow, in future versions I 
intend to take BC breaks into account, check the branch the PR is made to and match versions accordingly etc. But for 
now this does what it should do.

```yaml
name: Set Milestone
on:
  pull_request:
    types:
      - assigned
      - opened
      - synchronize
      - reopened
      - edited
      - ready_for_review
      - review_requested
jobs:
  set-milestone:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
        if: github.event.pull_request.milestone == null
      - name: 'Get Previous tag'
        if: github.event.pull_request.milestone == null
        id: previoustag
        uses: "WyriHaximus/github-action-get-previous-tag@master"
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
      - name: 'Get next minor version'
        if: github.event.pull_request.milestone == null
        id: semvers
        uses: "WyriHaximus/github-action-next-semvers@master"
        with:
          version: ${{ steps.previoustag.outputs.tag }}
      - name: 'Get Milestones'
        if: github.event.pull_request.milestone == null
        uses: "WyriHaximus/github-action-get-milestones@master"
        id: milestones
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
      - run: printf "::set-output name=number::%s" $(printenv MILESTONES | jq --arg MILESTONE $(printenv MILESTONE) '.[]  | select(.title == $MILESTONE) | .number')
        if: github.event.pull_request.milestone == null
        id: querymilestone
        env:
          MILESTONES: ${{ steps.milestones.outputs.milestones }}
          MILESTONE: ${{ steps.semvers.outputs.minor }}
      - name: 'Create Milestone'
        if: github.event.pull_request.milestone == null && steps.querymilestone.outputs.number == ''
        id: createmilestone
        uses: "WyriHaximus/github-action-create-milestone@master"
        with:
          title: ${{ steps.semvers.outputs.minor }}
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
      - name: 'Select found or created Milestone'
        if: github.event.pull_request.milestone == null
        id: selectmilestone
        run: |
            if [ $(echo ${QUERY_NUMBER} | wc -c) -eq 1 ] ; then
              printf "::set-output name=number::%s" "${CREATED_NUMBER}"
              exit 0
            fi

            printf "::set-output name=number::%s" "${QUERY_NUMBER}"
        env:
          CREATED_NUMBER: ${{ steps.createmilestone.outputs.number }}
          QUERY_NUMBER: ${{ steps.querymilestone.outputs.number }}
      - name: 'Set Milestone'
        if: github.event.pull_request.milestone == null
        uses: "WyriHaximus/github-action-set-milestone@master"
        with:
          issue_number: ${{ github.event.pull_request.number }}
          milestone_number: ${{ steps.selectmilestone.outputs.number }}
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

## Closing the Milestone

Assuming we've created a few PR's, and the workflow above added a milestone to them all. We can close the milestone to 
create a release.

In the following sections we've going over each step, of this workflow:

```yaml
name: Create Release
env:
  MILESTONE: ${{ github.event.milestone.title }}
on:
  milestone:
    types:
      - closed
jobs:
  generate-changelog:
    name: Generate Changelog
    runs-on: ubuntu-latest
    outputs:
      changelog: ${{ steps.changelog.outputs.changelog }}
    steps:
      - name: Generate changelog
        uses: WyriHaximus/github-action-jwage-changelog-generator@v1
        id: changelog
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          milestone: ${{ env.MILESTONE }}
      - name: Show changelog
        run: echo "${CHANGELOG}"
        env:
          CHANGELOG: ${{ steps.changelog.outputs.changelog }}
  create-release:
    name: Create Release
    needs:
      - generate-changelog
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
        env:
          CHANGELOG: ${{ needs.generate-changelog.outputs.changelog }}
      - run: |
          echo -e "${MILESTONE_DESCRIPTION}\r\n\r\n${CHANGELOG}" > release-${{ env.MILESTONE }}-release-message.md
          cat release-${{ env.MILESTONE }}-release-message.md
          release_message=$(cat release-${{ env.MILESTONE }}-release-message.md)
          release_message="${release_message//'%'/'%25'}"
          release_message="${release_message//$'\n'/'%0A'}"
          release_message="${release_message//$'\r'/'%0D'}"
          echo "::set-output name=release_message::$release_message"
        id: releasemessage
        env:
          MILESTONE_DESCRIPTION: ${{ github.event.milestone.description }}
          CHANGELOG: ${{ needs.generate-changelog.outputs.changelog }}
      - name: Create Reference Release with Changelog
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ env.MILESTONE }}
          release_name: ${{ env.MILESTONE }}
          body: ${{ steps.releasemessage.outputs.release_message }}
          draft: false
          prerelease: false
```

## Changelog Creation

To create a changelog my tool of choice has been [`jwage/changelog-generator`](https://github.com/jwage/changelog-generator) 
for a while now. As such I've created [`WyriHaximus/github-action-jwage-changelog-generator`](https://github.com/WyriHaximus/github-action-jwage-changelog-generator) 
to be used in workflows generating changelogs for a given milestone. As demoed below, an output is set with the 
changelog, so we can use it in the release creation step.

```yaml
  generate-changelog:
    name: Generate Changelog
    runs-on: ubuntu-latest
    outputs:
      changelog: ${{ steps.changelog.outputs.changelog }}
    steps:
      - name: Generate changelog
        uses: WyriHaximus/github-action-jwage-changelog-generator@v1
        id: changelog
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          milestone: ${{ env.MILESTONE }}
      - name: Show changelog
        run: echo "${CHANGELOG}"
        env:
          CHANGELOG: ${{ steps.changelog.outputs.changelog }}
```

## Creating the release

The creation of the release is made up of two steps. First we're talking the description from the milestone and append 
the generated changelog to it. It then needs some 

```yaml
  create-release:
    name: Create Release
    needs:
      - generate-changelog
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
        env:
          CHANGELOG: ${{ needs.generate-changelog.outputs.changelog }}
      - run: |
          echo -e "${MILESTONE_DESCRIPTION}\r\n\r\n${CHANGELOG}" > release-${{ env.MILESTONE }}-release-message.md
          cat release-${{ env.MILESTONE }}-release-message.md
          release_message=$(cat release-${{ env.MILESTONE }}-release-message.md)
          release_message="${release_message//'%'/'%25'}"
          release_message="${release_message//$'\n'/'%0A'}"
          release_message="${release_message//$'\r'/'%0D'}"
          echo "::set-output name=release_message::$release_message"
        id: releasemessage
        env:
          MILESTONE_DESCRIPTION: ${{ github.event.milestone.description }}
          CHANGELOG: ${{ needs.generate-changelog.outputs.changelog }}
      - name: Create Reference Release with Changelog
        uses: fleskesvor/create-release@feature/support-target-commitish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ env.MILESTONE }}
          release_name: ${{ env.MILESTONE }}
          body: ${{ steps.releasemessage.outputs.release_message }}
          draft: false
          prerelease: false
```

## Conclusion
