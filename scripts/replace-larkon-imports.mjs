import fs from 'fs';
import path from 'path';

function walk(dir) {
  try {
    fs.readdirSync(dir).forEach((n) => {
      const p = path.join(dir, n);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?)$/.test(n)) {
        let s = fs.readFileSync(p, 'utf8');
        const o = s;
        s = s.replace(/from ['"]@\//g, "from '@larkon/").replace(/import ['"]@\//g, "import '@larkon/").replace(/import\('@\//g, "import('@larkon/");
        if (s !== o) fs.writeFileSync(p, s);
      }
    });
  } catch (e) {}
}
walk(path.join(process.cwd(), 'app', 'admin', '(larkon)'));
walk(path.join(process.cwd(), 'src', 'larkon-admin'));
console.log('Done');
