---
layout: post
title: "Always recreating a TerraForm resource"
date: 2023-04-01 13:37dw
comments: true
categories:
- TerraForm
tags:
- TerraForm
social:
  image_relative: /images/posts/pexels-aviz-4447137.jpg
---

Force fully recreating a TerraForm resource is usually ill-advised, however, in some very specific situations this might 
exactly what you want. In my TerraForm set up I have two of such situations. One piece of software somehow stops working 
when no configuration is deployed, and the other's Helm Chart tries changing something that isn't allowed to change on a 
statefullset. The best course of action would be to figure out why, but sometimes you just don't want to and find a day 
to do the next somewhat acceptable thing: Uninstall and install them again.

![Yellow Caution tape](/images/posts/pexels-aviz-4447137.jpg)
> [Photo by Aviz from Pexels](https://www.pexels.com/photo/yellow-and-black-caution-sign-4447137/)

<!-- More -->

## When to consider using this

Don't, unless what you want to force create doesn't have any persistent storage, isn't mission critical, have other 
resources/services relying on it, can be gone for a bit, and there is no short term viable way to do this without this. 
Using this on the wrong resources can be destructive, so be very careful. No one wants to an accidentally deleted 
database cluster.

## Before we start

Now, I don't like this `hot fix`, but for now it's effective at not having to deal with problems that aren't big enough 
to spent more time on. This is also why I'm using Renovate to update the Prometheus PushGateway chart version every time 
they release an update in the example below:


```terraform
resource "helm_release" "pushgateway" {
  depends_on = [kubernetes_namespace.namespace]

  name = "pushgateway"

  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-pushgateway"
  version    = "2.7.1" ## Updated by Renovate

  namespace = kubernetes_namespace.namespace.metadata[0].name
  atomic    = true
  timeout   = var.helm_timeout

  values = [
    file("${path.module}/helm.values.yaml"),
  ]
}
```

## What we change

First we introduce a new resource that will always change on every single run:

```terraform
resource "terraform_data" "replacement" {
  input = timestamp()
}
```

Now this on it's own doesn't trigger the replace, we need to pair it with [`replace_triggered_by`](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#replace_triggered_by) on the `helm_release.pushgateway` resource:

```terraform
resource "helm_release" "pushgateway" {
  depends_on = [kubernetes_namespace.namespace]

  name = "pushgateway"

  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-pushgateway"
  version    = "2.7.1"

  namespace = kubernetes_namespace.namespace.metadata[0].name
  atomic    = true
  timeout   = var.helm_timeout

  values = [
    file("${path.module}/helm.values.yaml"),
  ]

  lifecycle {
    replace_triggered_by = [
      terraform_data.replacement
    ]
  }
}
```

Now each time apply is ran the helm chart will be uninstalled, and then reinstalled. Resolving the blocking error, but 
taking the service down for 10 - 20 seconds. Alternatively for `kubemod` I used almost the same approach. In my 
situation `kubemod` only has issues when I change the rules. Reducing the amount of times it needs to be uninstalled and 
reinstalled again I'm reinstalling it when it's configuration changes. To achieve that instead of the time, I'm using 
it's values file hash to force recreation:

```terraform
resource "terraform_data" "replacement" {
  input = [
    sha256(file("${path.module}/chart/values.yaml")),
    sha256(file("${path.module}/helm.values.yaml")),
  ]
}
```

### Edits

* 1 April 2024: Updated to use `terraform_data` instead of `null_resource` after a suggestion from [Charles](https://mastodon.social/@charlesnru) on [Mastodon](https://mastodon.social/@charlesnru/112197086991928351).
