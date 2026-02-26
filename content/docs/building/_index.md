---
title: "Building & Testing"
weight: 3
bookToc: true
---

# Building & Testing

## Local Mock Builds

The simplest way to build is through `fedpkg`:

```bash
fedpkg mockbuild
```

Check the build log (in `results_bpfman/`) for errors.

You can pass extra flags through to `mock` by adding `--` after the
`fedpkg` options. For example, to build **and** verify the resulting
RPMs install cleanly:

```bash
fedpkg mockbuild -- --postinstall
```

Or skip re-creating the chroot if you already built once:

```bash
fedpkg mockbuild --no-clean -- --postinstall
```

> [!TIP]
> **Why `--postinstall`?** This flag installs the built RPMs inside the
> mock chroot after the build finishes. It verifies that packages don't
> conflict with each other, that all runtime dependencies are available in
> Fedora, and that nothing is missing from the package. Always use it
> before submitting.

## Running Mock Directly

For more control over the build, you can use `fedpkg` just to generate
the SRPM and then hand it over to `mock` with the flags you need:

```bash
fedpkg srpm
mock -r fedora-rawhide-x86_64 rebuild bpfman-*.src.rpm
```

### Useful Mock Options

| Flag | Purpose |
|---|---|
| `--postinstall` | After building, install the built RPMs inside the chroot. Verifies that packages don't conflict with each other, that all runtime dependencies are available in Fedora, and that nothing is missing from the package. |
| `--no-clean` | Skip cleaning the chroot before building. Saves time when re-running after a fix since packages are already installed. |
| `-N` / `--no-cleanup-after` | Keep the chroot after the build finishes. Lets you inspect the build tree or debug failures with `--shell`. |
| `--shell` | Open an interactive shell inside the chroot (combine with `-N` from a previous build to inspect artifacts). |
| `--enable-network` | Allow network access during build (not normally needed and discouraged, but can help debug dependency issues). |

### Iterative Workflow

```bash
# First build -- keep the chroot and install the result
mock -r fedora-rawhide-x86_64 rebuild bpfman-*.src.rpm \
    --postinstall -N

# Something failed? Inspect the chroot
mock -r fedora-rawhide-x86_64 --shell

# Fix the issue, rebuild without re-downloading everything
mock -r fedora-rawhide-x86_64 rebuild bpfman-*.src.rpm \
    --no-clean --postinstall -N

# When done, clean up
mock -r fedora-rawhide-x86_64 --clean
```

## Scratch Builds on Koji

Once the package builds locally, you can test it on Fedora's
[Koji](https://koji.fedoraproject.org/) build system using a scratch
build. Scratch builds run on the real Koji infrastructure (matching the
exact buildroot, architectures, and dependencies available in Fedora)
but are **not** imported into the repository -- they are temporary test
builds that get garbage-collected after about one week.

```bash
# Build from the current branch (pushes SRPM to Koji)
fedpkg scratch-build --srpm

# Or build for specific architectures only
fedpkg scratch-build --srpm --arches x86_64 aarch64
```

You can monitor the build in your terminal or follow the Koji task URL
printed by `fedpkg`. To download the built RPMs from a scratch build,
use `koji download-task` with the task ID (not `koji download-build`,
which only works for real builds):

```bash
koji download-task <task-id>
```

### Why Scratch Build?

- Verify the package builds on **all Fedora architectures** (not just
  your local x86_64)
- Confirm that all `BuildRequires` are satisfiable in the **real Fedora
  buildroot**
- Test before submitting a real build with `fedpkg build`

For more details, see the
[Fedora Package Maintenance Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Package_Maintenance_Guide/)
and the [Koji documentation](https://docs.pagure.org/koji/HOWTO/).

## Disk Space

Rust builds with debuginfo are very large. If you run into
`No space left on device` errors during mock builds, try:

```bash
# Clean all mock chroots and caches
mock --scrub=all

# Or selectively clean old chroots
sudo rm -rf /var/lib/mock/fedora-*-bootstrap

# Check what's using space
sudo du -sh /var/lib/mock/* /var/cache/mock
```

If `/var` is on a small root partition, you can move mock's working
directory to a larger filesystem by adding this to
`/etc/mock/site-defaults.cfg`:

```python
config_opts['basedir'] = '/home/<user>/mock'
```
