import youtubedl from 'youtube-dl-exec';
import { mkdtemp, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MAX_BYTES = 45 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
  'tiktokv.com', 'www.tiktokv.com', 'instagram.com', 'www.instagram.com',
  'instagr.am', 'www.instagr.am', 'pinterest.com', 'www.pinterest.com',
  'pin.it', 'www.pin.it', 'pinterest.ca', 'www.pinterest.ca'
]);
let activeDownloads = 0;
const MAX_CONCURRENT_DOWNLOADS = 2;

export function validateSocialVideoUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  return ALLOWED_HOSTS.has(host) || [...ALLOWED_HOSTS].some(domain => host.endsWith(`.${domain}`));
}

export async function downloadSocialVideo(value) {
  const url = String(value || '').trim();
  if (!validateSocialVideoUrl(url)) {
    const error = new Error('الرابط غير مدعوم. أرسل رابطاً من TikTok أو Instagram أو Pinterest.');
    error.code = 'INVALID_URL';
    throw error;
  }
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    const error = new Error('حالياً أكو طلبات تحميل ثانية. انتظر دقيقة وجرب مرة ثانية.');
    error.code = 'BUSY';
    throw error;
  }

  activeDownloads += 1;
  const dir = await mkdtemp(path.join(tmpdir(), 'naghnogh-video-'));
  try {
    await youtubedl(url, {
      noPlaylist: true,
      noWarnings: true,
      quiet: true,
      noProgress: true,
      restrictFilenames: true,
      socketTimeout: 20,
      retries: 1,
      maxFilesize: '45M',
      format: 'best[ext=mp4][filesize<45M]/best[filesize<45M]/best',
      mergeOutputFormat: 'mp4',
      output: path.join(dir, '%(id)s.%(ext)s')
    }, { timeout: 120_000 });

    const entries = await readdir(dir, { withFileTypes: true });
    const candidates = [];
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.endsWith('.part') || entry.name.endsWith('.ytdl')) continue;
      const filePath = path.join(dir, entry.name);
      const info = await stat(filePath);
      if (info.size > 0) candidates.push({ path: filePath, name: entry.name, size: info.size });
    }
    candidates.sort((a, b) => b.size - a.size);
    const file = candidates[0];
    if (!file) {
      const error = new Error('ما گدرت أجهز الفيديو. ممكن الرابط خاص أو الموقع منع التحميل.');
      error.code = 'NO_FILE';
      throw error;
    }
    if (file.size > MAX_BYTES) {
      const error = new Error('حجم الفيديو أكبر من الحد المسموح (45 ميغابايت). جرّب رابط فيديو أقصر.');
      error.code = 'TOO_LARGE';
      throw error;
    }
    return { ...file, directory: dir };
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    if (error?.code) throw error;
    const message = String(error?.stderr || error?.message || 'download failed').toLowerCase();
    const friendly = /max-filesize|file is larger|filesize/i.test(message)
      ? 'حجم الفيديو أكبر من الحد المسموح (45 ميغابايت).'
      : /timed out|timeout/i.test(message)
        ? 'التحميل أخذ وقت أطول من اللازم. جرّب رابطاً آخر.'
        : 'تعذر تحميل هذا الرابط. تأكد أنه عام ويحتوي على فيديو، وجرب مرة ثانية لاحقاً.';
    const wrapped = new Error(friendly);
    wrapped.code = 'DOWNLOAD_FAILED';
    throw wrapped;
  } finally {
    activeDownloads = Math.max(0, activeDownloads - 1);
  }
}

export async function cleanupDownloadedVideo(file) {
  if (file?.directory) await rm(file.directory, { recursive: true, force: true }).catch(() => {});
}
