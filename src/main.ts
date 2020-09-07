import * as Yargs from 'yargs';
import { extname, basename } from 'path';
import { getChangeCount } from './git';
import { OwnerFinder } from './owner';

type CliArgs = {
  repoDir: string;
  ownerEmail: string;
  numDays: number;
  limit: number;
}

function fileFilter(path: string): boolean {
  const ext = extname(path);
  const filename = basename(path);
  if (filename === 'BUILD' || filename.endsWith('_proto.ts') || filename.endsWith('Proto.java') || filename === 'OWNERS' || filename === 'DEPS') {
    return false;
  }
  if (ext === '.es6' || ext === '.xlf' || ext === '.snap') {
    return false;
  }
  return true;
}

async function handler({ repoDir, numDays, ownerEmail, limit }: CliArgs) {
  const normalizedRepoDir = repoDir.startsWith('~')
    ? repoDir.replace('~', process.env.HOME!)
    : repoDir;
  const ownerFinder = new OwnerFinder(normalizedRepoDir);
  const changeCount = await getChangeCount(normalizedRepoDir, numDays, fileFilter);
  const matchFiles: string[] = [];
  for (const relativePath of changeCount.keys()) {
    const owners = ownerFinder.getOwners(relativePath);
    if (owners.has(ownerEmail)) {
      matchFiles.push(relativePath);
    }
  }

  const count = matchFiles.reduce<[string, number][]>((acc, file) => {
    acc.push([file, changeCount.get(file)!])
    return acc;
  }, []);
  count.sort((arr1, arr2) => arr2[1] - arr1[1]);
  
  for (let i = 0; i < count.length && i < limit; i++) {
    console.log(`${count[i][0]}: ${count[i][1]}`)
  }
}

Yargs.command('$0', 'Builds a specific page as a standalone app into target/<page>.', {
  builder: (): Yargs.Argv<CliArgs> => Yargs
    .option('repoDir', {
      describe: 'path to git repo',
      type: 'string',
      required: true,
    })
    .option('ownerEmail', {
      describe: 'email of the code owner',
      type: 'string',
      required: true,
    })
    .option('numDays', {
      describe: 'number of days to count',
      type: 'number',
      default: 30,
    })
    .option('limit', {
      describe: 'limit number of the rows of the result',
      type: 'number',
      default: 20,
    }),
    handler,
  })
  .strict(true)
  .exitProcess(true)
  .demandCommand()
  .showHelpOnFail(false, 'Specify --help for available options')
  .help()
  .parse();
