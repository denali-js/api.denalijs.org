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
