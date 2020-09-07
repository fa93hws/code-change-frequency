import { EOL } from 'os';
import { existsSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';

type OwnerSpec = {
  noparent: boolean;
  owners: Set<string>;
  perFile: Record<string, Set<string>>;
}

export class OwnerFileParser {
  private readonly cache = new Map<string, OwnerSpec>();

  constructor(private readonly repoDir: string) {}

  private normalizeOwners(owner: string): string[] {
    if (owner.startsWith('file://')) {
      const filePathRelative = owner.slice(7);
      const ownerSpec = this.parseFile(join(this.repoDir, filePathRelative));
      return [...ownerSpec.owners];
    } else {
      return [owner];
    }
  }

  private parseContent(content: string): OwnerSpec {
    const lines = content.split(EOL);
    let noparent = false;
    const owners = new Set<string>();
    const perFile: Record<string, Set<string>> = {};
    lines.forEach(line => {
      if (line.trim() === 'set noparent') {
        noparent = true;
      } else if (line.startsWith('per-file')) {
        const [, perfileContent] = line.split('per-file');
        const [file, owner] = perfileContent.trim().split('=');
        perFile[join(this.repoDir, file)] = new Set(this.normalizeOwners(owner));
      } else {
        this.normalizeOwners(line).forEach(owner => owners.add(owner));
      }
    });
    return {
      noparent,
      owners,
      perFile,
    };
  }

  // path: absolute path
  parseFile(path: string): OwnerSpec {
    const cache = this.cache.get(path);
    if (cache == null) {
      const content = readFileSync(path, { encoding: 'utf-8' });
      const ownerSpec = this.parseContent(content.trim());
      this.cache.set(path, ownerSpec);
      return ownerSpec;
    } else {
      return cache;
    }
  }
}

export class OwnerFinder {
  private readonly ownerfileParser: OwnerFileParser;
  // absolute path -> owner file location
  private readonly reason = new Map<string, string>();

  constructor(private readonly repoDir: string) {
    this.ownerfileParser = new OwnerFileParser(repoDir);
  }

  private findOwnerFile(absPath: string): undefined | string {
    if (absPath === dirname(this.repoDir)) {
      return undefined
    }
    const potentialOwnerFile = join(absPath, 'OWNERS');
    if (existsSync(potentialOwnerFile)) {
      return potentialOwnerFile;
    } else {
      return this.findOwnerFile(dirname(absPath));
    }
  }

  // path: relative
  getOwners(path: string): Set<string> {
    const absPath = join(this.repoDir, path);
    const ownerFile = this.findOwnerFile(dirname(absPath));
    if (ownerFile == null) {
      throw new Error('owners file not found for ' + path);
    }
    this.reason.set(path, ownerFile);
    const ownerSpec = this.ownerfileParser.parseFile(ownerFile);
    if (ownerSpec.perFile[absPath] != null) {
      return ownerSpec.perFile[absPath];
    } else {
      return ownerSpec.owners;
    }
  }
}
