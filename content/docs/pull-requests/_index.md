---
title: "Submitting a Pull Request"
weight: 4
bookToc: true
---

# Submitting a Pull Request

This section covers the final steps of the contribution workflow:
committing your changes, opening a pull request on Fedora dist-git,
and what happens after it is merged.

This guide is written from the perspective of a **community
contributor** who is *not* in the Fedora *packager* group. If you
already have packager access, the same workflow applies -- you just
have a few additional shortcuts (noted inline).

For background on the full Fedora process, see the
[Fedora Pull Request Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/).

## Prerequisites

Before submitting a pull request you need a
[Fedora Account (FAS)](https://accounts.fedoraproject.org/) and a
**fork** of the
[bpfman dist-git repository](https://src.fedoraproject.org/rpms/bpfman).
If you haven't set these up yet, see
[Getting Started]({{< relref "/docs/getting-started" >}}) for the
full walkthrough.

In short:

1. Click **Fork** on the
   [bpfman Pagure page](https://src.fedoraproject.org/rpms/bpfman)
   (requires FAS login).
2. Clone your fork and add the upstream remote:

```bash
git clone ssh://git@pkgs.fedoraproject.org/forks/<your-fas-user>/rpms/bpfman.git
cd bpfman
git remote add upstream ssh://git@pkgs.fedoraproject.org/rpms/bpfman.git
git fetch upstream
```

3. Create a feature branch from the target (usually `rawhide`):

```bash
git checkout -b fix-cve-2025-0977 upstream/rawhide
```

## Committing and Pushing

After you have made your changes (patches, vendor tarball, spec
updates) and
[tested locally]({{< relref "/docs/building" >}}), prepare the
vendor tarball and commit.

### Handling the Vendor Tarball

The vendor tarball is too large for git and must be uploaded to the
[lookaside cache](https://src.fedoraproject.org/lookaside/rpms/bpfman/).
How you handle this depends on your access level:

**Community contributors** (not in the *packager* group) -- use
`--offline` mode. This updates the `sources` and `.gitignore` files
locally without uploading anything. Mention in your pull request
description that the maintainer needs to run `fedpkg new-sources`
after merging:

```bash
fedpkg new-sources --offline bpfman-<version>-vendor.tar.xz
```

**Packagers** (members of the *packager* group) -- upload directly:

```bash
fedpkg new-sources bpfman-<version>-vendor.tar.xz
```

In both cases, `fedpkg new-sources` updates `sources` and
`.gitignore` for you.

### Committing and Pushing to Your Fork

```bash
git add bpfman.spec sources *.patch .gitignore
git commit -m "Fix CVE-2025-0977: Update openssl to 0.10.70 (rhbz#2344554)"
git push -u origin fix-cve-2025-0977
```

You are pushing to **your fork** (`origin`), not to the main
repository. The pull request you open next will propose merging your
fork's branch into the upstream branch.

### Commit Message and Bugzilla Integration

The bpfman spec uses
[rpmautospec](https://fedora-infra.github.io/rpmautospec-docs/),
so your **commit message becomes the package changelog entry**
automatically. Write it as you would want it to appear in
`rpm -q --changelog`.

To have [Bodhi](https://bodhi.fedoraproject.org/) automatically
associate and **close a Bugzilla bug** when the update reaches stable,
include `rhbz#nnn` (no space) in the commit message:

```
Fix CVE-2025-0977: Update openssl to 0.10.70 (rhbz#2344554)
```

This generates a changelog entry like:

```
* Thu Feb 27 2026 Your Name <you@fedoraproject.org> - 0.5.4-2
- Fix CVE-2025-0977: Update openssl to 0.10.70 (rhbz#2344554)
```

| Syntax | Effect |
|---|---|
| `rhbz#2344554` (no space) | Bodhi adds the bug to the update and closes it when stable |
| `rhbz #2344554` (with space) | Bodhi does **not** associate or close the bug |
| `(rhbz#111, rhbz#222)` | Multiple bugs can be referenced in one commit |

For richer changelog entries, use the extended format -- an ellipsis
(`...`) on the first line of the commit body appends text, and dashed
lines become separate changelog items:

```
Bump openssl to 0.10.70 (rhbz#2344554)

... resolves CVE-2025-0977
- Regenerated vendor tarball with updated dependencies
```

Which produces:

```
* Thu Feb 27 2026 Your Name <you@fedoraproject.org> - 0.5.4-2
- Bump openssl to 0.10.70 (rhbz#2344554) resolves CVE-2025-0977
- Regenerated vendor tarball with updated dependencies
```

> [!TIP]
> Use `rpmautospec generate-changelog` to preview how the generated
> changelog will look before pushing.

For full details, see the
[rpmautospec %autochangelog documentation](https://fedora-infra.github.io/rpmautospec-docs/autochangelog.html).

## Creating the Pull Request

Fedora dist-git uses [Pagure](https://pagure.io/), which works
similarly to GitHub or GitLab but with its own terminology. Pull
requests are created from your **fork** against the **upstream**
repository at
[src.fedoraproject.org/rpms/bpfman](https://src.fedoraproject.org/rpms/bpfman).

### From the Command Line

When you push to your fork, the `git push` output includes a direct
link to create the pull request:

```
remote: Create a pull-request for fix-cve-2025-0977
remote:    https://src.fedoraproject.org/fork/<user>/rpms/bpfman/diff/rawhide..fix-cve-2025-0977
```

Open that URL in your browser to fill in the title and description.

### From the Pagure Web UI

1. Go to your fork at
   `https://src.fedoraproject.org/fork/<your-fas-user>/rpms/bpfman`
2. Click **Pull Requests** in the top navigation, then
   **New Pull Request**
3. Set the **target repo** to `rpms/bpfman` (the main repository)
4. Set the **target branch** to the branch you want your changes
   merged into:
   - `rawhide` for fixes targeting the next Fedora release
   - A release branch (e.g. `f43`) for fixes targeting a specific
     stable release (see
     [Backporting](#backporting-fixes-to-release-branches) below)
5. Set the **source branch** to your feature branch
   (e.g. `fix-cve-2025-0977`)
6. Fill in the title and description

### What to Include in the Description

- **What changed and why** -- reference the CVE identifier, upstream
  advisory, and/or Bugzilla number
- **Vendor tarball status** -- if you used
  `fedpkg new-sources --offline`, state that the maintainer needs to
  run `fedpkg new-sources` to upload the tarball after merging
- **Links** -- upstream advisory, Bugzilla bug, upstream commit or PR
- **Testing** -- mention that you ran `fedpkg mockbuild` successfully
  (and on which architecture, if relevant)

Example:

```
Fix CVE-2025-0977: Update vendored openssl to 0.10.70

- Regenerated vendor tarball with openssl bumped to 0.10.70
- Resolves rhbz#2344554

Note: vendor tarball was prepared with `fedpkg new-sources --offline`;
maintainer needs to run `fedpkg new-sources` before building.

Upstream advisory: https://rustsec.org/advisories/RUSTSEC-2025-XXXX
```

## Continuous Integration

Dist-git repositories are connected to CI by default. For every pull
request, a **Koji scratch build** and an **installability test** are
run automatically. Results appear on the pull request page when
available.

If CI fails, investigate and fix the issue before expecting a review.
To re-trigger the CI pipeline, post a comment containing:

```
[citest]
```

> [!TIP]
> Even though failing CI does not technically block merging, maintainers
> expect CI to be green before reviewing.

## Review

Pull request review follows the same conventions as any open source
project. A maintainer will either merge directly, ask questions, or
request changes. Push any follow-up fixes to the **same branch** --
the pull request updates automatically.

> [!NOTE]
> Many Fedora packages are maintained by volunteers, so there are no
> hard limits on response time. If a pull request goes unreviewed for
> an extended period, follow Fedora's
> [Non-responsive maintainer policy](https://docs.fedoraproject.org/en-US/fesco/Non_Responsive_Maintainers_Procedure/).

## After the Merge

Once a maintainer merges your pull request, several follow-up steps
happen before the fix reaches users. As a **community contributor**,
most of these are handled by the maintainer -- but understanding the
process helps you track the status of your fix and answer questions.

### What the Maintainer Does

1. **Upload sources** -- if you used `fedpkg new-sources --offline`,
   the maintainer runs `fedpkg new-sources` to upload the vendor
   tarball to the lookaside cache. (If you are a *packager* and already
   uploaded it, this step is skipped.)

2. **Submit a Koji build** -- the maintainer kicks off the official
   build:

```bash
fedpkg build
```

3. **Submit a Bodhi update** (release branches only) -- if the change
   targets a **release branch** (e.g. `f43`, `f42`) rather than
   *rawhide*, the maintainer
   [submits a Bodhi update](https://bodhi.fedoraproject.org/) so the
   fix reaches stable repositories through the normal update process.
   Changes to *rawhide* are picked up automatically by the next
   compose and do not need a Bodhi update.

   If your commit message included `rhbz#nnn` references, Bodhi will
   automatically associate those bugs with the update and close them
   when the update reaches stable.

### What You Can Do as a Contributor

- **Track the build** -- search for bpfman on
  [Koji](https://koji.fedoraproject.org/koji/packageinfo?packageID=bpfman)
  to verify the build succeeded.
- **Test the update** -- once the Bodhi update lands in
  *updates-testing*, install it and leave karma on the
  [Bodhi update page](https://bodhi.fedoraproject.org/updates/?packages=bpfman):

```bash
dnf --enablerepo=updates-testing update bpfman
```

- **Follow up on Bugzilla** -- if the bug is still open after the
  update reaches stable, comment on the Bugzilla with the update link.

For full details on the post-merge process, see the
[Fedora Pull Request Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/).

## Backporting Fixes to Release Branches

Not every fix lands in *rawhide* first. Security vulnerabilities are
often tracked against a **specific Fedora release** (e.g.
[BZ#2427972](https://bugzilla.redhat.com/show_bug.cgi?id=2427972) --
CVE-2026-21895 against Fedora 43 only). In that case the fix must be
applied directly to the release branch and shepherded through Bodhi.

### Targeting the Right Branch (Contributor)

Create your feature branch from the **release branch** instead of
`rawhide`. From your existing fork clone:

```bash
git fetch upstream
git checkout -b fix-cve-2026-21895 upstream/f43
```

Apply your changes following the full
[Patching Dependencies]({{< relref "/docs/patching" >}}) workflow
**from the release branch's source tree**. You must regenerate the
vendor tarball from scratch on this branch -- do not reuse a tarball
built on *rawhide*. The release branch may pin a different upstream
version, carry different existing patches, or resolve to a different
set of transitive dependencies in `Cargo.lock`, so the vendor tarball
contents can differ significantly.

Then prepare the tarball and commit:

```bash
fedpkg new-sources --offline bpfman-<version>-vendor.tar.xz
git add bpfman.spec sources *.patch .gitignore
git commit -m "Fix CVE-2026-21895: Update RSA crate (rhbz#2427972)"
git push -u origin fix-cve-2026-21895
```

Open a pull request on Pagure with the **target branch set to `f43`**
(not `rawhide`). See
[Creating the Pull Request](#creating-the-pull-request) above for the
step-by-step Pagure workflow.

If the same fix is also needed in *rawhide* or other release branches,
repeat the full process for each branch independently. You can
cherry-pick the *spec and patch changes*, but you **must regenerate
the vendor tarball and rebuild on the target branch** -- the resolved
`Cargo.lock` (and therefore the vendor tarball contents) will almost
certainly differ between branches.

> [!NOTE]
> If you are a *packager* with commit access, you can push directly to
> the `f43` branch in the main repo with `fedpkg switch-branch f43`.
> The pull request workflow is still recommended for traceability.

### Post-Merge: Build and Bodhi Update (Maintainer)

After the pull request is merged into the release branch, the
**maintainer** handles the remaining steps. Contributors cannot
perform these actions but should understand the process to track the
status of their fix.

1. **Upload the vendor tarball** (if the contributor used `--offline`):

```bash
fedpkg new-sources bpfman-<version>-vendor.tar.xz
```

2. **Submit a Koji build** on the release branch:

```bash
fedpkg switch-branch f43
fedpkg build
```

3. **Submit a Bodhi security update** -- for CVE fixes, set the
   update type to `security` so it is flagged appropriately and can
   be fast-tracked:

```bash
fedpkg update --type security --severity low \
    --notes "Fix CVE-2026-21895: RSA crate DoS via malformed prime (rhbz#2427972)" \
    --bugs 2427972
```

| Flag | Purpose |
|---|---|
| `--type security` | Marks the update as a security fix; required for CVEs |
| `--severity low\|medium\|high\|critical` | Matches the CVE severity from the Bugzilla tracker |
| `--bugs 2427972` | Explicitly associates the Bugzilla bug (in addition to any `rhbz#` in the commit) |
| `--notes "..."` | Free-text description shown on the Bodhi update page |

The update can also be created through the
[Bodhi web UI](https://bodhi.fedoraproject.org/updates/new) by
searching for the build NVR and filling in the same fields.

### The Update Lifecycle

Once submitted, the update follows the standard Bodhi lifecycle:

1. **updates-testing** -- the update lands in the testing repository.
   Users (and automated systems) can install it early with
   `dnf --enablerepo=updates-testing update bpfman`.
2. **Karma / waiting period** -- the update collects positive or
   negative karma from testers. Security updates have a **shorter
   mandatory waiting period** (typically 3 days for `low`/`medium`,
   less for `urgent`/`critical` if an accelerated push is requested).
3. **Stable** -- after enough positive karma or the waiting period
   expires, the update is pushed to stable. Bodhi automatically closes
   any associated Bugzilla bugs at this point.

> [!TIP]
> As a contributor, you can help move the update to stable faster by
> installing it from *updates-testing* and leaving positive karma on
> the [Bodhi update page](https://bodhi.fedoraproject.org/updates/?packages=bpfman).
> You can also check the current status with
> `bodhi updates query --packages bpfman`.

### Bugzilla Tracking for Backports

Red Hat Product Security creates **per-release tracker bugs** for CVEs
that affect Fedora. For example,
[BZ#2427972](https://bugzilla.redhat.com/show_bug.cgi?id=2427972) is
the Fedora 43 tracker for CVE-2026-21895, which blocks the parent CVE
bug
[BZ#2427935](https://bugzilla.redhat.com/show_bug.cgi?id=2427935).

When preparing your fix:

- Reference the **per-release tracker** in your commit message
  (`rhbz#2427972`), not the parent CVE bug.
- If the Bugzilla is assigned to you, move it to `ASSIGNED` while you
  work on the fix. Bodhi will move it to `CLOSED/ERRATA` once the
  update reaches stable.
- If the same CVE has trackers for multiple releases (e.g. `f42` and
  `f43`), each release branch needs its own pull request, build,
  Bodhi update, and bug reference.

### Quick Reference: Rawhide vs. Release Branch

| | Rawhide | Release branch (e.g. `f43`) |
|---|---|---|
| **PR target branch** | `rawhide` | `f43` |
| **Build** | `fedpkg build` (maintainer) | `fedpkg build` (maintainer) |
| **Bodhi update** | Not needed (next compose picks it up) | Required (`fedpkg update --type security`) |
| **Bug closure** | Manual or via next release | Automatic when update reaches stable |
| **Contributor can do** | Open PR, test locally | Open PR, test locally, leave karma |

### Quick Reference: Contributor vs. Maintainer Responsibilities

| Step | Contributor | Maintainer / Packager |
|---|---|---|
| Fork and clone | Yes | N/A (direct access) |
| Create feature branch | Yes | Yes |
| Apply patches, regenerate vendor tarball | Yes | Yes |
| `fedpkg new-sources` (upload) | `--offline` only | Direct upload |
| `fedpkg mockbuild` (local test) | Yes | Yes |
| Open pull request on Pagure | Yes | Optional |
| `fedpkg build` (Koji) | No | Yes |
| `fedpkg update` (Bodhi) | No | Yes |
| Leave karma on Bodhi update | Yes | Yes |

For general information about the Fedora security update process, see
the
[Fedora discussion on CVE updates](https://discussion.fedoraproject.org/t/fedora-linux-43-and-cve-2026-41651/189638/6)
and the
[Fedora Packaging Guidelines on security updates](https://docs.fedoraproject.org/en-US/packaging-guidelines/#_security_updates_to_resolve_known_cve_issues).
