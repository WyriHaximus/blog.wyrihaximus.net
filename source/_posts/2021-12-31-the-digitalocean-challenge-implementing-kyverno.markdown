---
layout: post
title: "The DigitalOcean challenge: Implementing Kyverno"
date: 2021-12-31 13:37dw
comments: true
categories:
- Kubernetes
- DigitalOcean
- Kyverno
tags:
- YAML
- security
- policy
social:
  image_relative: /images/posts/kyverno/header.jpg
---

DigitalOcean put a [challenge](https://www.digitalocean.com/community/pages/kubernetes-challenge) out at the end of 
this year to improve your knowledge of Kubernetes. And while it's been nearly two years I created my first cluster 
with them, (It's still my main public cluster.), there is always more to 
learn. So in this post we're going to take a look at [Kyverno](https://kyverno.io/) for policy enforcement.

![PHP 8.1 fibers (green threads)](/images/posts/kyverno/header.jpg)
> [Photo by Erik Mclean from Pexels](https://www.pexels.com/photo/notice-about-wearing-protecting-face-mask-on-entrance-door-7146602/)

<!-- More -->

Before we begin, I left out all the boilerplate GitHub Actions Workflows to deploy/manage PR's/etc. You can find the 
policies discussed in this post on [GitHub here](https://github.com/WyriHaximus/do-k8s-challenge).

# Creating the cluster

For this challenge I created the cluster by hand instead of terraform, and had some fun with adding five node pools 
with two nodes each and autoscaling on them.

![Create Cluster](/images/posts/kyverno/create-cluster.png)

Keep in mind that you need to change the autoscaling after creating the cluster, you cannot do that while setting it 
up through the UI.

![Set Autoscaling](/images/posts/kyverno/set-autoscaling.png)

Give it some time, and you have a nice 10 node cluster.

![10 Node Cluster](/images/posts/kyverno/10-node-cluster.png)

# Deploying Kyverno

As usual installing something through Helm is a walk in the park and should take less than a minute. The following four 
commands add the repository where the Kyverno helm charts live, make sure we are up to date with all repositories. And 
then install both Kyverno and its set of default [policies](https://github.com/kyverno/kyverno/tree/main/charts/kyverno-policies). 

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno --namespace kyverno --create-namespace --atomic
helm install kyverno-policies kyverno/kyverno-policies --namespace kyverno --atomic
```

![Install Kyverno](/images/posts/kyverno/installing-kyverno.png)

Give it a minute or two and you have `Kyverno` running on your cluster:

![Kyverno Running](/images/posts/kyverno/kyverno-running.png)

# Example: Pod anti-affinity

My cluster use small nodes by preference. Big enough to run any large stateful set, but small enough that they can be 
spun up quickly without becoming costly. As such I prefer to only have one pod per deployment on a node. (Except during 
rolling upgrades.) So as such my deployments look like this (taken from my 
[`default-backend`](https://artifacthub.io/packages/helm/wyrihaximusnet/default-backend) chart):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: default-backend
spec:
  selector:
    matchLabels:
      app: default-backend
      release: default-backend
  replicas: 13
  template:
    metadata:
      labels:
        app: default-backend
        release: default-backend
        appRevision: default-backend-1
    spec:
      containers:
        - name: default-backend
          image: "ghcr.io/wyrihaximusnet/default-backend:random"
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: appRevision
                    operator: In
                    values:
                      - default-backend-1
              topologyKey: "kubernetes.io/hostname"
```

The affinity configuration on that deployment only allows one pod per revision per node. That means that during 
rolling upgrades you might have two per node for a brief moment. Kyverno lets you make this mandatory by adding a 
validating cluster policy like this one:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: one-pod-per-deployment-per-node
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: one-pod-per-deployment-per-node
      match:
        resources:
          kinds:
            - Deployment
      validate:
        message: "All pods most have anti-affinity to not have more than one pod of the same deployment revision on the same node"
        pattern:
          spec:
            template:
              spec:
                affinity:
                  podAntiAffinity:
                    requiredDuringSchedulingIgnoredDuringExecution:
                      - topologyKey: "kubernetes.io/hostname"
      exclude:
        resources:
          namespaces:
            - "kube-system"
            - kyverno
```

My recommendation would be to manage your cluster's policies through a `Helm` chart or `TerraForm`. But for now we're 
applying it with `kubectl`:

![Applying policy](/images/posts/kyverno/applying-policy.png)

So when you try to deploy something without the required anti affinity, 
like [`hello`](https://artifacthub.io/packages/helm/cloudecho/hello) with the following Helm command, it fails:

```bash
helm install my-hello cloudecho/hello -n hello --create-namespace --atomic --wait
```

![AntiAffinity Validation Error](/images/posts/kyverno/antiaffinity-validation-error.png)

The `default-backend` deployment, deploys just fine with this policy in place. And as shown in the policy, you can 
exclude namespaces you don't want this policy to apply to.

# Example: Node CPU Architecture

The Kubernetes cluster I'm building at home currently only runs on `arm64` nodes. But I have a second hand set of 
`arm7` nodes I intend to add to it later on. And since not everything runs on `arm7` (or `arm64` but that is a 
different discussion), I want to ensure only specific pods end up on those nodes.

There are two ways of forcing a pod on specific node, a) `nodeSelector`, or b) `nodeAffinity`. Since `nodeSelector` 
only supports key value mappings we're going with `nodeAffinity` as we can specify more than one architecture. A 
deployment that supports both `arm7` and `arm64` looks like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: default-backend
spec:
  selector:
    matchLabels:
      app: default-backend
      release: default-backend
  replicas: 13
  template:
    metadata:
      labels:
        app: default-backend
        release: default-backend
    spec:
      containers:
        - name: default-backend
          image: "ghcr.io/wyrihaximusnet/default-backend:random"
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                  - arm64
                  - arm7
```

The policy to enforce that is: 

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cpu-architecture
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: require-cpu-architecture
      match:
        resources:
          kinds:
            - Deployment
      validate:
        message: "All pods most have nodeAffinity configured with CPU architecture so it always ends up on a node that has a CPU architecture supported by the used OCI image"
        pattern:
          spec:
            template:
              spec:
                affinity:
                  nodeAffinity:
                    requiredDuringSchedulingIgnoredDuringExecution:
                      nodeSelectorTerms:
                        - matchExpressions:
                            - key: kubernetes.io/arch
                              operator: In
      exclude:
        resources:
          namespaces:
            - "kube-system"
            - kyverno
```

As you can see this is very similar to the pod anti-affinity. (When I started writing this post the expectation was 
that this example would not be as similar, well lesson learned!) 

When using this policy on a DigitalOcean cluster with only `amd64` nodes you get a bunch pending pods that can't go 
anywhere because DigitalOcean only has `amd64` nodes:

![Pending Pods](/images/posts/kyverno/pending-pods.png)

We already know the why, but you can check a pod's events why it is pending:

![Why Pod is Pending](/images/posts/kyverno/why-pod-is-pending.png)

We can also see the CPU architecture of the node by its labels:

![Node labels](/images/posts/kyverno/node-labels.png)

# Testing

A cool thing about Kyverno is that it lets you test policies locally without a cluster. And all you need to write are 
failing or passing resources for your policies and link them up in a `test.yaml` specifying the policies, resources, 
and most importantly the expected outcome:

```yaml
name: DigitalOcean Challenge
policies:
  - policies/one-pod-per-deployment-per-node.yaml
  - policies/require-cpu-architecture.yaml
resources:
  - tests/fail/both.yaml
  - tests/pass/both.yaml
  - tests/pass/one-pod-per-deployment-per-node.yaml
  - tests/pass/require-cpu-architecture.yaml
results:
  - policy: one-pod-per-deployment-per-node
    rule: one-pod-per-deployment-per-node
    resource: one-pod-per-deployment-per-node
    kind: Deployment
    result: pass
  - policy: one-pod-per-deployment-per-node
    rule: one-pod-per-deployment-per-node
    resource: default-backend
    kind: Deployment
    result: pass
  - policy: one-pod-per-deployment-per-node
    rule: one-pod-per-deployment-per-node
    resource: fail
    kind: Deployment
    result: fail
  - policy: require-cpu-architecture
    rule: require-cpu-architecture
    resource: require-cpu-architecture
    kind: Deployment
    result: pass
  - policy: require-cpu-architecture
    rule: require-cpu-architecture
    resource: default-backend
    kind: Deployment
    result: pass
  - policy: require-cpu-architecture
    rule: require-cpu-architecture
    resource: fail
    kind: Deployment
    result: fail
```

Run the [`Kyverno CLI`](https://kyverno.io/docs/kyverno-cli/) against it to test it and you get a nice list of which 
behaves as expected.

![Tests output](/images/posts/kyverno/tests.png)

# Conclusion

The challenge was the nudge I needed to look at harding certain things on my Kubernetes clusters. And now I kinda 
want to figure out if I can make pod disruption budgets and HPA's mandatory on Helm charts deployed to my clusters. 
But also look into [`vcluster`](https://www.vcluster.com/) to give all of my applications their own virtual cluster 
and all applications are fully isolated within the cluster.
