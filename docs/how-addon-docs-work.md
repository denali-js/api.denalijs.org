# How versions of your docs are built

## RegistryFollowerService

The RegistryFollowerService handles watching the npm registry for changes
and building docs for new versions as the come out. This is a good baseline
to have, since we can maintain a comprenhensive list of public Denali addons
and their docs, with zero effort additional effort from addon authors.

This service is responsible for creating new Addon records as new addons are
published for the first time, as well as for creating new Version records to
correspond to each new version published. It's how the system first learns of
Addons

However, because npm only sees the published tarballs, that means that addon
authors would be unable to update their docs (i.e. fix a typo) without
releasing a new version of their addon. Many will likely see this
requirement as onerous, so enter the RepoPollerService.

## RepoPollerService

As addons are published to the registry and we are notified, the
RegistryFollowerService will note if they contain any repository information
in their package.json. If it's a valid Github repository, the
RepoPollerService service will start polling Github to check for updates,
allowing addon authors to update docs by simply pushing to a branch of their
repo - no need to publish a new version.

The polling is not on a fixed interval - it's designed to maximize the
frequency of updates while respecting Github's API rate limits. It will fit
in as many requests / hour as it can. As the number of addons grows, this will
inevitably lead to longer times between refresh for a given addon, at which
point webhooks may be needed.

> "Why not use webhooks from day one" you ask? That requires OAuth permissions
> from the repo owner, which is complicated and involves active participation
> from addon authors.

This polling service creates new Version records for each _branch_ it
encounters that it thinks corresponds to a "release branch" (the Version is
flagged with the `isBranch` flag to indicate this). This service will only
touch these branch Versions.

A branch is determined to correspond to a release when it's name is a valid semver string.

In the docs UI, the versions show will generally be:

  - master (a special case)
  - all branch versions found on the repo (i.e. all the docs built from
    branches with a valid semver name)
  - published versions at the author chosen granularity (major.minor by
    default)

# Docs configuration

You can customize the details of how your docs are built by adding a
`config/docs.json` file to your project. Here's an example, with all
the default values:

```
{
  // The directory containing any markdown files (i.e. guides, tutorials, etc)
  "pagesDir": "docs",
  // The directories containing source code that should be scanned to build the API docs
  "sourceDirs": [ "app", "lib" ],
  // When displaying docs to users, how granular should the version dropdown get? Allowed values: "major" (i.e. 1.x, 2.x), "minor" (i.e. 1.1, 2.3), and "patch" (i.e. 1.3.1, 2.4.8)
  "granularity": "minor",
  "branches": [
    {
      "branchName": "master",
      "displayName": "master"
    }
  ]
}
```

More options may be added over time.