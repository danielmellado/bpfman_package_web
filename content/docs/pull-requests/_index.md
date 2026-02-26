---
title: "Submitting a Pull Request"
weight: 4
bookToc: true
---

# Submitting a Pull Request

This section covers the final steps of the contribution workflow:
committing your changes, opening a pull request on Fedora dist-git,
and what happens after it is merged.

For background on the full Fedora process, see the
[Fedora Pull Request Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/).

## Committing and Pushing

After you have made your changes (patches, vendor tarball, spec
updates) and
[tested locally]({{< relref "/docs/building" >}}), commit and push
to your fork:

```bash
fedpkg new-sources bpfman-<version>-vendor.tar.xz
git add bpfman.spec sources *.patch .gitignore
git commit -m "Fix CVE-2025-0977: Update openssl to 0.10.70 (rhbz#2344554)"
git push -u origin fix-cve-2025-0977
```

`fedpkg new-sources` uploads the vendor tarball to the
[lookaside cache](https://src.fedoraproject.org/lookaside/rpms/bpfman/)
and updates both `sources` and `.gitignore` for you. If you are **not**
in the *packager* group, use `fedpkg new-sources --offline` instead --
the maintainer who merges will upload it.

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

When you push to your fork, the output includes a link to create
the pull request:

```
remote: Create a pull-request for fix-cve-2025-0977
remote:    https://src.fedoraproject.org/fork/<user>/rpms/bpfman/diff/rawhide..fix-cve-2025-0977
```

You can also create the pull request from the
[Pagure web UI](https://src.fedoraproject.org/rpms/bpfman/pull-requests)
for your fork. The target branch is usually `rawhide`; use the
appropriate release branch (e.g. `f43`) if you are fixing a specific
Fedora release.

In the pull request description:

- Summarize what changed and why (e.g. CVE identifier, upstream
  advisory)
- If you could not upload sources to the lookaside cache, mention that
  so the maintainer knows to run `fedpkg new-sources`
- Link to any relevant upstream advisories or bug reports

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

Once a maintainer merges your pull request, a few follow-up steps are
still needed before the fix reaches users:

1. **Upload sources** -- if you could not push to the lookaside cache
   (i.e. you are not in the *packager* group), the maintainer must run
   `fedpkg new-sources` before building.

2. **Submit a build** -- the maintainer (or any packager) kicks off the
   official build:

```bash
fedpkg build
```

3. **Submit a Bodhi update** -- if the change targets a **release
   branch** (e.g. `f43`, `f42`) rather than *rawhide*, the maintainer
   must [submit a Bodhi update](https://bodhi.fedoraproject.org/) so the
   fix reaches stable repositories through the normal update process.
   Changes to *rawhide* are picked up automatically by the next compose.

   If your commit message included `rhbz#nnn` references, Bodhi will
   automatically associate those bugs with the update and close them
   when the update reaches stable.

For full details on the post-merge process, see the
[Fedora Pull Request Guide](https://docs.fedoraproject.org/en-US/package-maintainers/Pull_Request_Guide/).
