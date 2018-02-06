export interface PackageMetadata {
  name: string;
  'dist-tags': {
    [distTag: string]: string;
  };
  versions: {
    [version: string]: {
      name: string;
      keywords: string[];
      dist: {
        tarball: string;
      }
    }
  }
}