import { join } from 'path';
import { OwnerFileParser } from '../owner';

describe('OwnerFileParser', () => {
  const fixtureFolder = join(__dirname, 'fixtures');
  const ownerFileParser = new OwnerFileParser(fixtureFolder);

  it('parse no parent', () => {
    const ownerSpec = ownerFileParser.parseFile(join(fixtureFolder, 'noparent'));
    expect(ownerSpec).toEqual({
      noparent: true,
      owners: new Set(['someone@somewhere.com']),
      perFile: {},
    });
  });

  it('parse perfile', () => {
    const ownerSpec = ownerFileParser.parseFile(join(fixtureFolder, 'perfile'));
    expect(ownerSpec).toEqual({
      noparent: false,
      owners: new Set(),
      perFile: {
        [join(fixtureFolder, 'compiled_ejs_loader.ts')]: new Set(['eric@canva.com'])
      },
    });
  });

  it('parse simple', () => {
    const ownerSpec = ownerFileParser.parseFile(join(fixtureFolder, 'simple'));
    expect(ownerSpec).toEqual({
      noparent: false,
      owners: new Set(['someone@somewhere.com', 'someoneelse@somewhereelse.com']),
      perFile: {},
    });
  });

  it('parse reference', () => {
    const ownerSpec = ownerFileParser.parseFile(join(fixtureFolder, 'reference'));
    expect(ownerSpec).toEqual({
      noparent: false,
      owners: new Set(['someone@somewhere.com']),
      perFile: {
        [join(fixtureFolder, '.eslintrc.js')]: new Set(['someone@somewhere.com', 'someoneelse@somewhereelse.com'])
      },
    });
  });

  it('parse complex', () => {
    const ownerSpec = ownerFileParser.parseFile(join(fixtureFolder, 'complex'));
    expect(ownerSpec).toEqual({
      noparent: true,
      owners: new Set(['hearnden@canva.com', 'joscha@canva.com']),
      perFile: {
        [join(fixtureFolder, '.eslintrc.js')]: new Set(['someone@somewhere.com']),
        [join(fixtureFolder, '.eslintrc-js.js')]: new Set(['someone@somewhere.com', 'someoneelse@somewhereelse.com']),
        [join(fixtureFolder, 'webpack.package.js')]: new Set(['christian.s@canva.com']),
        [join(fixtureFolder, 'webpack.package.ts')]: new Set(['christian.s@canva.com']),
      },
    });
  });
})