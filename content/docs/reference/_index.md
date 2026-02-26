---
title: "Reference"
weight: 5
bookToc: true
---

# Reference

## Common Errors

### "failed to select a version" / "perhaps a crate was updated and forgotten to be re-vendored?"

```
error: failed to select a version for the requirement `time = "~0.3.36"` (locked to 0.3.47)
candidate versions found which didn't match: 0.3.36
location searched: directory source `.../vendor`
```

**Cause:** The vendor tarball doesn't contain the crate version
referenced in `Cargo.lock`.

**Fix:** Regenerate the vendor tarball
(see [Patching Dependencies, Step 6]({{< relref "/docs/patching#6-regenerate-the-vendor-tarball" >}}))
with all patches applied.

---

### "failed to select a version for `serde_derive`" / version conflict

```
all possible versions conflict with previously selected packages.
previously selected package `serde_derive v1.0.210`
```

**Cause:** The patch was hand-edited and only bumps the top-level crate
without updating transitive dependencies.

**Fix:** Use `cargo update <crate> --precise <version>` instead of
hand-editing `Cargo.lock`
(see [Patching Dependencies, Step 4]({{< relref "/docs/patching#4-use-cargo-update-to-bump-the-dependency" >}})),
then regenerate the patch.

---

### Cargo checksum verification failure

```
error: the listed checksum of `.../vendor/<crate>/src/lib.rs` has changed
```

**Cause:** A file inside the vendor directory was modified after
vendoring (e.g. license fix for `ring`).

**Fix:** The spec already handles this in `%prep` by truncating the
`.cargo-checksum.json` files. If you add new in-vendor patches,
make sure this `find ... sed` block runs **after** your modifications.

---

### No space left on device

```
install: error copying './target/release/bpfman' to '.../BUILDROOT/usr/bin/bpfman':
No space left on device
```

**Cause:** Rust debug builds are very large and filled your root
partition.

**Fix:** See [Disk Space]({{< relref "/docs/building#disk-space" >}}).

## Patch Naming Convention

Follow this pattern for consistency:

```
NNNN-bump-<crate>-to-<version>-CVE-YYYY-NNNNN.patch
```

| Component | Description |
|---|---|
| `NNNN` | Sequential four-digit number (`0001`, `0002`, ...) |
| `<crate>` | The primary crate being bumped |
| `<version>` | The target version |
| `CVE-YYYY-NNNNN` | The CVE identifier, if applicable |

**Examples:**
- `0002-bump-openssl-to-0.10.70-CVE-2025-0977.patch`
- `0003-bump-time-to-0.3.47-CVE-2026-25727.patch`

## End-to-End Example

Here is the complete workflow to bump `time` from 0.3.36 to 0.3.47
(CVE-2026-25727), from fork to pull request:

```bash
# -- 1. Set up your fork (one-time) --
# Fork on https://src.fedoraproject.org/rpms/bpfman, then:
git clone ssh://git@pkgs.fedoraproject.org/forks/$USER/rpms/bpfman.git bpfman-fedora
cd bpfman-fedora
git remote add upstream ssh://git@pkgs.fedoraproject.org/rpms/bpfman.git
git fetch upstream
git checkout -b fix-cve-2026-25727 upstream/rawhide

# Clone upstream source at matching tag
git clone https://github.com/bpfman/bpfman.git ../bpfman-upstream
cd ../bpfman-upstream
git checkout v0.5.4

# -- 2. Create the patch --
# Apply existing patches
patch -p1 < ../bpfman-fedora/0001-bump-cargo-lock-for-idna-1-0-3.diff
patch -p1 < ../bpfman-fedora/0002-bump-openssl-to-0.10.70-CVE-2025-0977.patch

# Save baseline
cp Cargo.lock Cargo.lock.baseline

# Let cargo resolve everything properly
cargo update time --precise 0.3.47

# Generate the patch
diff -u Cargo.lock.baseline Cargo.lock \
  | sed 's|--- Cargo.lock.baseline|--- c/Cargo.lock|;s|+++ Cargo.lock|+++ w/Cargo.lock|' \
  > ../bpfman-fedora/0003-bump-time-to-0.3.47-CVE-2026-25727.patch

# Verify full patch chain
git checkout -- Cargo.lock
patch -p1 < ../bpfman-fedora/0001-*.diff
patch -p1 < ../bpfman-fedora/0002-*.patch
patch -p1 < ../bpfman-fedora/0003-*.patch

# -- 3. Re-vendor --
rm -rf vendor
cargo vendor --versioned-dirs
tar -Jcf ../bpfman-fedora/bpfman-0.5.4-vendor.tar.xz vendor/

# -- 4. Update the packaging tree --
cd ../bpfman-fedora

# Upload new vendor tarball to lookaside cache
fedpkg new-sources bpfman-0.5.4-vendor.tar.xz

# Update the spec (add/update Patch entries, License field, etc.)
# Then commit everything
git add bpfman.spec sources *.patch .gitignore
git commit -m "Bump time to 0.3.47 - CVE-2026-25727 (rhbz#2345678)"

# -- 5. Test --
# Local mock build with post-install verification
fedpkg mockbuild -- --postinstall

# Scratch build on Koji (tests all architectures)
fedpkg scratch-build --srpm

# -- 6. Submit --
git push -u origin fix-cve-2026-25727
# Open a Pull Request at https://src.fedoraproject.org/rpms/bpfman/pull-requests
```

## Summarizing

> [!CAUTION]
>
> - **NEVER** hand-edit `Cargo.lock`.
> - **ALWAYS** use `cargo update --precise` to bump crates.
> - **ALWAYS** regenerate the vendor tarball after patching.
> - **ALWAYS** verify the full patch chain applies from scratch.
> - **ALWAYS** use `--postinstall` when testing mock builds.

## Useful Links

| Resource | URL |
|---|---|
| bpfman upstream | [github.com/bpfman/bpfman](https://github.com/bpfman/bpfman) |
| bpfman dist-git | [src.fedoraproject.org/rpms/bpfman](https://src.fedoraproject.org/rpms/bpfman) |
| Fedora Package Maintenance Guide | [docs.fedoraproject.org](https://docs.fedoraproject.org/en-US/package-maintainers/Package_Maintenance_Guide/) |
| Fedora Pull Request Guide | [docs.fedoraproject.org](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/) |
| Installing Packager Tools | [docs.fedoraproject.org](https://docs.fedoraproject.org/en-US/package-maintainers/Installing_Packager_Tools/) |
| Bodhi Updates System | [bodhi.fedoraproject.org](https://bodhi.fedoraproject.org/) |
| rpmautospec %autochangelog | [fedora-infra.github.io](https://fedora-infra.github.io/rpmautospec-docs/autochangelog.html) |
| Koji Build System | [koji.fedoraproject.org](https://koji.fedoraproject.org/) |
| Koji Documentation | [docs.pagure.org/koji](https://docs.pagure.org/koji/HOWTO/) |
