import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

async function run() {
  const exportDir = join(process.cwd(), 'r2_export_files');
  
  console.log('Reading files from local directory...');
  // read all files recursively
  const { readdir } = await import('node:fs/promises');
  async function* getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = join(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* getFiles(res);
      } else {
        yield join(dir, dirent.name);
      }
    }
  }

  const keys = [];
  for await (const f of getFiles(exportDir)) {
    const relativePath = f.replace(exportDir + '\\', '').replace(/\\/g, '/');
    keys.push(relativePath);
  }
  console.log(`Found ${keys.length} files to upload.`);

  console.log('Finished downloading files! Now uploading to remote R2...');
  
  // Upload to Cloudflare R2
  const bucketName = 'saas-blog-images';
  
  const uploadConcurrency = 5;
  let active = 0;
  let index = 0;

  await new Promise((resolve) => {
    function queueNext() {
      if (index >= keys.length && active === 0) {
        resolve();
        return;
      }
      
      while (active < uploadConcurrency && index < keys.length) {
        const key = keys[index++];
        active++;
        
        const filePath = join(exportDir, key);
        console.log(`Uploading [${index}/${keys.length}]: ${key}`);
        
        const child = spawn('npx', [
          'wrangler', 'r2', 'object', 'put', `${bucketName}/${key}`, '--file', filePath
        ], { stdio: ['ignore', 'inherit', 'inherit'], shell: true });

        child.on('close', (code) => {
          if (code !== 0) {
            console.error(`Failed to upload ${key} - exit code ${code}`);
          }
          active--;
          queueNext();
        });
      }
    }
    queueNext();
  });

  console.log('All done!');
}

run().catch(console.error);
