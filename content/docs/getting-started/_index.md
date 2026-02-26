---
title: "Getting Started"
weight: 1
bookToc: true
---

# Getting Started

## Fedora Account and Tools

Before contributing, you need:

1. A [Fedora Account (FAS)](https://accounts.fedoraproject.org/) --
   sign up if you don't have one
2. The Fedora packager tools installed locally:

```bash
sudo dnf install fedpkg fedora-packager mock cargo rust
sudo usermod -aG mock $USER
newgrp mock
```

For full details, see
[Installing Packager Tools](https://docs.fedoraproject.org/en-US/package-maintainers/Installing_Packager_Tools/).

## Cloning the Repository

The bpfman package lives in Fedora's
[dist-git](https://src.fedoraproject.org/rpms/bpfman) system. Clone it
with `fedpkg`:

```bash
fedpkg clone bpfman
cd bpfman
```

This clones the dist-git repo and checks out the default branch
(`rawhide`). The `sources` file references tarballs stored in Fedora's
lookaside cache -- `fedpkg` handles downloading them automatically
when you build.

You will also need a clone of the upstream source at the matching
release tag:

```bash
git clone https://github.com/bpfman/bpfman.git ../bpfman-upstream
cd ../bpfman-upstream
git checkout v0.5.4   # must match the spec Version
```

## Repository Layout

```
bpfman-fedora/
├── bpfman.spec                          # RPM spec file
├── sources                              # SHA512 checksums (lookaside cache refs)
├── 0001-bump-cargo-lock-for-*.diff      # Patch 0: Cargo.lock changes
├── 0002-bump-<crate>-CVE-*.patch        # Patch 1: Cargo.lock changes
├── 0003-bump-<crate>-CVE-*.patch        # Patch 2: Cargo.lock changes
└── ...
```

The upstream source lives in a separate clone (e.g. `../bpfman-upstream`),
checked out at the tag matching the spec `Version:` field.

## Contribution Workflow Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Contribution Workflow                             │
│                                                                      │
│  ┌─-─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │  Fork on  │   │  Clone   │   │  Create  │   │  Make changes:   │  │
│  │  src.     ├──►│  your    ├──►│  feature ├──►│  patch, vendor,  │  │
│  │  fedora   │   │  fork    │   │  branch  │   │  spec, sources   │  │
│  │  project  │   │          │   │          │   │                  │  │
│  └──-────────┘   └──────────┘   └──────────┘   └────────┬─────────┘  │
│                                                         │            │
│                                                         ▼            │
│  ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │  Merge!  │    │  Open    │   │  Scratch │   │  Test locally:   │  │
│  │          │◄───┤  Pull    │◄──┤  build   │◄──┤  fedpkg          │  │
│  │          │    │  Request │   │  on Koji │   │  mockbuild       │  │
│  └──────────┘    └──────────┘   └──────────┘   └──────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Step by step:**

1. **Fork** the package on
   [src.fedoraproject.org/rpms/bpfman](https://src.fedoraproject.org/rpms/bpfman)
   by clicking the **Fork** button (requires FAS login)

2. **Clone your fork** locally:

```bash
git clone ssh://git@pkgs.fedoraproject.org/forks/<your-fas-user>/rpms/bpfman.git
cd bpfman
git remote add upstream ssh://git@pkgs.fedoraproject.org/rpms/bpfman.git
git fetch upstream
```

3. **Create a feature branch** from the target branch (usually
   `rawhide`):

```bash
git checkout -b fix-cve-2026-25727 upstream/rawhide
```

4. **Make your changes** -- update patches, regenerate vendor tarball,
   update the spec and `sources` file
   (see [Patching Dependencies]({{< relref "/docs/patching" >}}))

5. **Upload the vendor tarball** to the lookaside cache and commit:

```bash
fedpkg new-sources bpfman-<version>-vendor.tar.xz
git add bpfman.spec sources *.patch .gitignore
git commit -m "Bump <crate> to <version> (CVE-XXXX-XXXXX)"
git push -u origin fix-cve-2026-25727
```

   `fedpkg new-sources` uploads the tarball to the
   [lookaside cache](https://src.fedoraproject.org/lookaside/rpms/bpfman/)
   and updates both `sources` and `.gitignore` for you. Large binary
   files like vendor tarballs must **never** be committed to git
   directly.

6. **Test locally** before submitting
   (see [Building & Testing]({{< relref "/docs/building" >}})):

```bash
fedpkg mockbuild -- --postinstall
```

7. **Open a Pull Request** on
   [src.fedoraproject.org](https://src.fedoraproject.org/rpms/bpfman/pull-requests)
   from your fork's branch to the target branch (e.g. `rawhide`)

For the full Fedora contribution workflow, see the
[Fedora Pull Request Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/)
and the
[Package Maintenance Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Package_Maintenance_Guide/).
