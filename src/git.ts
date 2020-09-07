import { EOL } from 'os';
import { spawn } from 'child_process';

function executeGitScript(repoDir: string, numDays: number): Promise<string> {
  const script = [
    `pushd ${repoDir} >/dev/null`,
    `git log --name-only --pretty=format: --since '${numDays} days ago' --no-merges | sort | uniq -c`,
    'popd >/dev/null'
  ].join(EOL);
  return new Promise(resolve => {
    const cmd = spawn(script, { shell: true });

    let progressText = '';
    cmd.stdout.on('data', (data) => {
      progressText += data;
    });
    
    cmd.stderr.on('data', (data) => {
      console.warn(`stderr: ${data}`);
    });
    
    cmd.on('close', () => {
      resolve(progressText)
    });
  })
}

export async function getChangeCount(repoDir: string, numDays: number, fileFilter: (path: string) => boolean): Promise<Map<string, number>> {
  const response = await executeGitScript(repoDir, numDays);
  const changeCount = new Map<string, number>();
  const regex = /^\s+(\d+)\s+(.+)$/;
  response.split(EOL).forEach(line => {
    if (!regex.test(line)) {
      return;
    }
    const matches = line.match(regex);
    if (matches == null || matches.length !== 3) {
      return;
    }
    const [, countStr, path] = matches;
    const count = parseInt(countStr, 10);
    if (Number.isNaN(count)) {
      throw new Error(`Can not parse count: ${countStr}; line: ${line}`);
    }
    if (fileFilter(path)) {
      changeCount.set(path, count);
    }
  });
  return changeCount;
}