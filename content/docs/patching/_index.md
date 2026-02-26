---
title: "Patching Dependencies"
weight: 2
bookToc: true
---

# Patching Dependencies

This section covers the core workflow: creating a patch to bump a
vendored Rust crate and regenerating the vendor tarball.

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Patching Workflow                              │
│                                                                     │
│  ┌────────-───┐    ┌──────────────┐    ┌───────────────────────┐    │
│  │  Upstream  │    │  Apply all   │    │  cargo update <crate> │    │
│  │  source    ├───►│  existing    ├───►│  --precise <version>  │    │
│  │  checkout  │    │  patches     │    │                       │    │
│  └─────────-──┘    └──────────────┘    └───────────┬───────────┘    │
│                                                   │                 │
│                                                   ▼                 │
│  ┌───────────┐    ┌──────────────┐    ┌───────────────────────┐     │
│  │  Update   │    │  Repackage   │    │  Generate patch from  │     │
│  │  sources  │◄───┤  vendor      │◄───┤  Cargo.lock diff      │     │
│  │  checksum │    │  tarball     │    │                       │     │
│  └─────┬─────┘    └──────────────┘    └───────────────────────┘     │
│        │                                                            │
│        ▼                                                            │
│  ┌───────────┐                                                      │
│  │  fedpkg   │                                                      │
│  │ mockbuild │                                                      │
│  └───────────┘                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Prepare the Upstream Source

Start from a clean upstream checkout at the correct tag:

```bash
cd ../bpfman-upstream
git checkout v<version>
git status  # must be clean
```

## 2. Apply All Existing Patches

Apply every patch currently listed in the spec, **in order**:

```bash
patch -p1 < ../bpfman-fedora/0001-bump-cargo-lock-for-idna-1-0-3.diff
patch -p1 < ../bpfman-fedora/0002-bump-openssl-to-0.10.70-CVE-2025-0977.patch
patch -p1 < ../bpfman-fedora/0003-bump-time-to-0.3.47-CVE-2026-25727.patch
```

## 3. Save the Baseline

Save a copy of `Cargo.lock` **after** all existing patches are applied.
This becomes the baseline for your new patch:

```bash
cp Cargo.lock Cargo.lock.baseline
```

## 4. Use `cargo update` to Bump the Dependency

> [!WARNING]
> **Do not hand-edit `Cargo.lock`.** Always use `cargo update` to ensure
> all transitive dependencies are resolved correctly.

```bash
cargo update <crate-name> --precise <target-version>
```

For example:

```bash
cargo update time --precise 0.3.47
```

`cargo update` will also bump any transitive dependencies that the new
version requires. A hand-edited patch that only changes the top-level
crate entry **will fail** at build time with errors like:

```
error: failed to select a version for the requirement `time = "~0.3.36"` (locked to 0.3.47)
candidate versions found which didn't match: 0.3.36
```

### Why Hand-Editing Fails

When you bump a crate like `time` from 0.3.36 to 0.3.47, the new
version may depend on different versions of its own dependencies. For
example, `time 0.3.47` pulled in these transitive changes:

| Crate | Old Version | New Version |
|---|---|---|
| `serde` | 1.0.210 | 1.0.228 |
| `serde_core` | *(new)* | 1.0.228 |
| `serde_derive` | 1.0.210 | 1.0.228 |
| `syn` | 2.0.79 | 2.0.87 |
| `deranged` | 0.3.11 | 0.5.8 |
| `num-conv` | 0.1.0 | 0.2.0 |
| `time-core` | 0.1.2 | 0.1.8 |
| `time-macros` | 0.2.18 | 0.2.27 |

A patch that only changes the `time` line would leave all these at their
old versions, causing version conflicts at build time.

## 5. Generate the Patch

Diff the baseline against the updated `Cargo.lock` and write it as
the new patch file. Use `c/` and `w/` prefixes (or `a/`/`b/`) so
that `patch -p1` strips them correctly:

```bash
diff -u Cargo.lock.baseline Cargo.lock \
  | sed 's|--- Cargo.lock.baseline|--- c/Cargo.lock|;s|+++ Cargo.lock|+++ w/Cargo.lock|' \
  > ../bpfman-fedora/0004-bump-<crate>-to-<ver>-CVE-XXXX-XXXXX.patch
```

Verify it applies cleanly on a fresh run:

```bash
git checkout -- Cargo.lock
# Re-apply all patches including the new one
patch -p1 < ../bpfman-fedora/0001-*.diff
patch -p1 < ../bpfman-fedora/0002-*.patch
patch -p1 < ../bpfman-fedora/0003-*.patch
patch -p1 < ../bpfman-fedora/0004-*.patch
```

## 6. Regenerate the Vendor Tarball

With all patches applied (including your new one), re-vendor:

```bash
rm -rf vendor
cargo vendor --versioned-dirs
```

### Vendor Cleanup Checklist

Before packaging, check for files that violate Fedora policies:

| Issue | What to look for | Action |
|---|---|---|
| **P434 curve code** | `vendor/fiat-crypto-*/src/p434.rs` | Remove the file and references to it |
| **RTLO characters** | Unicode `0x202E` in `vendor/idna-*/IdnaTestV2.txt` | Remove the forbidden code points |
| **Executable `.rs`** | `.rs` files with `+x` permission | Fixed automatically in `%prep` |

> [!NOTE]
> Newer crate versions may no longer include these problematic files.
> Always verify before spending time on cleanup.

### Package the Tarball

```bash
tar -Jcf ../bpfman-fedora/bpfman-<version>-vendor.tar.xz vendor/
```

## 7. Update the `sources` File

Compute the new SHA512 checksum and update the `sources` file:

```bash
cd ../bpfman-fedora
sha512sum bpfman-<version>-vendor.tar.xz
```

Replace the old `SHA512 (bpfman-<version>-vendor.tar.xz) = ...` line
in the `sources` file with the new hash.

Or, if you have push access, use `fedpkg new-sources` which uploads the
tarball to the lookaside cache and updates `sources` and `.gitignore`
automatically:

```bash
fedpkg new-sources bpfman-<version>-vendor.tar.xz
```

## 8. Update the Spec File

Add your new patch to `bpfman.spec`:

```spec
Patch3:         0004-bump-<crate>-to-<ver>-CVE-XXXX-XXXXX.patch
```

If the vendor cleanup rules changed (e.g. a `sed` targeting a specific
vendored crate version), update those lines in `%prep` as well.

Also check whether the **License** field needs updating -- bumped
crates may introduce new licenses. Compare the `LICENSE SUMMARY` output
from the build log against the spec's `License:` field.
