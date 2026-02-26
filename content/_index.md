---
title: "bpfman Fedora Packaging Guide"
type: docs
---

# bpfman Fedora Packaging Guide

Welcome to the contributor guide for the
[bpfman](https://bpfman.io) Fedora package.

bpfman is an eBPF program manager that simplifies the deployment and
administration of eBPF programs. This guide covers everything you need
to know to contribute to its Fedora packaging -- from setting up your
environment, through patching vendored Rust dependencies, to submitting
your changes upstream.

## Why This Guide?

Since bpfman is a Rust project that uses **vendored Cargo dependencies**,
updating even a single crate (e.g. for a CVE fix) requires regenerating
the entire vendor tarball. Hand-editing `Cargo.lock` is a common pitfall
that leads to subtle build failures. This guide documents the correct
workflow.

## Quick Navigation

- **[Getting Started]({{< relref "/docs/getting-started" >}})** -- Set up your Fedora account, tools, and clone the repository.
- **[Patching Dependencies]({{< relref "/docs/patching" >}})** -- Create patches, regenerate vendor tarballs, and update the spec.
- **[Building & Testing]({{< relref "/docs/building" >}})** -- Mock builds, scratch builds on Koji, and post-install verification.
- **[Reference]({{< relref "/docs/reference" >}})** -- Common errors, patch naming conventions, and key takeaways.
