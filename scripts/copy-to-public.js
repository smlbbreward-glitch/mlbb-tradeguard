import { readdirSync, cpSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const src = join(process.cwd(), 'dist');
const dst = join(process.cwd(), 'public');

if (existsSync(src)) {
  if (existsSync(dst)) {
    rmSync(dst, { recursive: true, force: true });
  }
  cpSync(src, dst, { recursive: true });
  console.log('Copied dist -> public for Vercel deployment');
} else {
  console.warn('dist/ not found, skipping copy to public/');
}
