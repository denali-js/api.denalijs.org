export interface Dict<T> {
  [key: string]: T;
}

export interface PackageMetadata {
  name: string;
  description: string;
  'dist-tags': Dict<string>;
  versions: Dict<VersionMetadata>;
}

export interface VersionMetadata {
  name: string;
  version: string;
  keywords: string[];
  dist: {
    tarball: string;
  };
  repository?: string | {
    type: string;
    url: string;
  };
}

export interface GithubBranchData {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface DocsConfig {
  pagesDir: string;
  sourceDirs: string[];
  /**
   * How specific should docs versions get?
   *
   * major - only show one set of docs per major version
   * minor - only show one set of docs per major.minor version
   * patch - show docs for every possible version
   *
   * Note that this only applies to versions sourced from tags. If you have
   * branches configured via `branches` or `semverBranches`, this will not
   * affect versions sourced from those branches.
   */
  granularity: 'major' | 'minor' | 'patch';
  /**
   * Determines which versions are visible, and where they are sourced from.
   *
   * branches-only: ignore published versions on npm, only show docs from branches
   * branches-over-tags: if a branch has a semver name, hide all tags subsumed by that semver string
   * tags-only: ignore all branches, only show docs built from published npm versions
   */
  versionStrategy: 'branches-only' | 'branches-over-tags' | 'tags-only';
  /**
   * An array of branches and their display names that should be used to build docs from
   */
  branches: BranchConfig[];
  /**
   * If true, branches with valid semver strings for their name will be tracked
   * and built as docs versions, regardless of whether they appear in `branches`.
   *
   * If the branch appears in both, the display name from `branches` will be used.
   * Otherwise, the branch name itself is used.
   *
   * Pairs nicely with `versionStrategy: 'branches-over-tags'`; if you have a
   * branch named "v1.7.x" (for example), it will be shown instead of any of the
   * 1.7.x series tags.
   */
  semverBranches: boolean;
}

export interface BranchConfig {
  branchName?: string;
  displayName?: string;
}
